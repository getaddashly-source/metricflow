import { decryptShopifyToken } from "@/lib/shopify/encryption";
import { createAdminClient } from "@/lib/supabase/admin";

const SHOPIFY_API_VERSION = "2024-10";

export interface ShopifyOrder {
  id: number;
  name: string;
  created_at: string;
  total_price: string;
  subtotal_price: string;
  total_discounts: string;
  total_tax: string;
  financial_status: string;
  fulfillment_status: string | null;
  cancelled_at: string | null;
  customer: {
    id: number;
    orders_count: number;
  } | null;
  line_items: {
    id: number;
    product_id: number | null;
    title: string;
    variant_title: string | null;
    quantity: number;
    price: string;
  }[];
  refunds: {
    id: number;
    created_at: string;
    transactions: {
      amount: string;
    }[];
  }[];
}

interface ShopifyOrdersResponse {
  orders: ShopifyOrder[];
}

interface DailyAggregate {
  order_date: string;
  total_orders: number;
  total_revenue: number;
  total_refunds: number;
  net_revenue: number;
  total_items_sold: number;
  new_customers: number;
  returning_customers: number;
  orders_fulfilled: number;
  orders_pending: number;
  orders_cancelled: number;
}

interface ProductAggregate {
  product_id: string;
  product_title: string;
  variant_title: string;
  total_quantity_sold: number;
  total_revenue: number;
  total_orders: number;
}

async function fetchOrders(
  shopDomain: string,
  accessToken: string,
  dateFrom: string,
  dateTo: string,
): Promise<ShopifyOrder[]> {
  const allOrders: ShopifyOrder[] = [];
  let url: string | null =
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/orders.json?` +
    new URLSearchParams({
      status: "any",
      created_at_min: `${dateFrom}T00:00:00Z`,
      created_at_max: `${dateTo}T23:59:59Z`,
      limit: "250",
      fields:
        "id,name,created_at,total_price,subtotal_price,total_discounts,total_tax,financial_status,fulfillment_status,cancelled_at,customer,line_items,refunds",
    }).toString();

  while (url) {
    const res: Response = await fetch(url, {
      headers: { "X-Shopify-Access-Token": accessToken },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Shopify Orders API error (${res.status}): ${body}`);
    }

    const body = (await res.json()) as ShopifyOrdersResponse;
    allOrders.push(...body.orders);

    // Pagination via Link header
    const linkHeader = res.headers.get("Link");
    if (linkHeader) {
      const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      url = nextMatch ? nextMatch[1] : null;
    } else {
      url = null;
    }
  }

  return allOrders;
}

function aggregateByDay(orders: ShopifyOrder[]): DailyAggregate[] {
  const dayMap = new Map<string, DailyAggregate>();

  for (const order of orders) {
    const dateStr = order.created_at.split("T")[0];

    if (!dayMap.has(dateStr)) {
      dayMap.set(dateStr, {
        order_date: dateStr,
        total_orders: 0,
        total_revenue: 0,
        total_refunds: 0,
        net_revenue: 0,
        total_items_sold: 0,
        new_customers: 0,
        returning_customers: 0,
        orders_fulfilled: 0,
        orders_pending: 0,
        orders_cancelled: 0,
      });
    }

    const day = dayMap.get(dateStr)!;

    day.total_orders += 1;
    day.total_revenue += parseFloat(order.total_price);

    // Refunds
    const refundAmount = (order.refunds ?? []).reduce((sum, refund) => {
      return (
        sum +
        refund.transactions.reduce((tSum, t) => tSum + parseFloat(t.amount), 0)
      );
    }, 0);
    day.total_refunds += refundAmount;

    // Items sold
    const itemCount = order.line_items.reduce((sum, li) => sum + li.quantity, 0);
    day.total_items_sold += itemCount;

    // Customer type
    if (order.customer) {
      if (order.customer.orders_count <= 1) {
        day.new_customers += 1;
      } else {
        day.returning_customers += 1;
      }
    }

    // Fulfillment status
    if (order.cancelled_at) {
      day.orders_cancelled += 1;
    } else if (order.fulfillment_status === "fulfilled") {
      day.orders_fulfilled += 1;
    } else {
      day.orders_pending += 1;
    }
  }

  // Compute net revenue and avg order value
  for (const day of dayMap.values()) {
    day.net_revenue =
      Math.round((day.total_revenue - day.total_refunds) * 100) / 100;
    day.total_revenue = Math.round(day.total_revenue * 100) / 100;
    day.total_refunds = Math.round(day.total_refunds * 100) / 100;
  }

  return Array.from(dayMap.values()).sort((a, b) =>
    a.order_date.localeCompare(b.order_date),
  );
}

function aggregateByProduct(
  orders: ShopifyOrder[],
): ProductAggregate[] {
  const prodMap = new Map<string, ProductAggregate>();

  for (const order of orders) {
    if (order.cancelled_at) continue; // skip cancelled

    for (const li of order.line_items) {
      if (!li.product_id) continue;
      const key = String(li.product_id);

      if (!prodMap.has(key)) {
        prodMap.set(key, {
          product_id: key,
          product_title: li.title,
          variant_title: li.variant_title ?? "",
          total_quantity_sold: 0,
          total_revenue: 0,
          total_orders: 0,
        });
      }

      const prod = prodMap.get(key)!;
      prod.total_quantity_sold += li.quantity;
      prod.total_revenue += li.quantity * parseFloat(li.price);
      prod.total_orders += 1;
    }
  }

  // Round revenue
  for (const p of prodMap.values()) {
    p.total_revenue = Math.round(p.total_revenue * 100) / 100;
  }

  return Array.from(prodMap.values()).sort(
    (a, b) => b.total_revenue - a.total_revenue,
  );
}

export async function syncOrdersForStore(
  shopifyStoreDbId: string,
  shopDomain: string,
  encryptedToken: string,
  dateFrom: string,
  dateTo: string,
): Promise<{ synced: number; error?: string }> {
  const accessToken = decryptShopifyToken(encryptedToken);
  const adminClient = createAdminClient();

  let orders: ShopifyOrder[];
  try {
    orders = await fetchOrders(shopDomain, accessToken, dateFrom, dateTo);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await adminClient.from("shopify_sync_logs").insert({
      shopify_store_id: shopifyStoreDbId,
      sync_type: "orders",
      status: "failed",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      error_message: message,
      sync_date_from: dateFrom,
      sync_date_to: dateTo,
    });
    return { synced: 0, error: message };
  }

  if (orders.length === 0) return { synced: 0 };

  // Aggregate by day
  const dailyRows = aggregateByDay(orders).map((d) => ({
    shopify_store_id: shopifyStoreDbId,
    order_date: d.order_date,
    total_orders: d.total_orders,
    total_revenue: d.total_revenue,
    total_refunds: d.total_refunds,
    net_revenue: d.net_revenue,
    total_items_sold: d.total_items_sold,
    avg_order_value:
      d.total_orders > 0
        ? Math.round((d.total_revenue / d.total_orders) * 100) / 100
        : 0,
    new_customers: d.new_customers,
    returning_customers: d.returning_customers,
    orders_fulfilled: d.orders_fulfilled,
    orders_pending: d.orders_pending,
    orders_cancelled: d.orders_cancelled,
  }));

  const { error: orderUpsertError } = await adminClient
    .from("shopify_order_analytics")
    .upsert(dailyRows, { onConflict: "shopify_store_id,order_date" });

  if (orderUpsertError) {
    await adminClient.from("shopify_sync_logs").insert({
      shopify_store_id: shopifyStoreDbId,
      sync_type: "orders",
      status: "failed",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      error_message: orderUpsertError.message,
      sync_date_from: dateFrom,
      sync_date_to: dateTo,
    });
    return { synced: 0, error: orderUpsertError.message };
  }

  // Aggregate by product
  const productRows = aggregateByProduct(orders).map((p) => ({
    shopify_store_id: shopifyStoreDbId,
    product_id: p.product_id,
    product_title: p.product_title,
    variant_title: p.variant_title,
    total_quantity_sold: p.total_quantity_sold,
    total_revenue: p.total_revenue,
    total_orders: p.total_orders,
    date_from: dateFrom,
    date_to: dateTo,
  }));

  if (productRows.length > 0) {
    await adminClient
      .from("shopify_product_analytics")
      .upsert(productRows, {
        onConflict: "shopify_store_id,product_id,date_from",
      });
  }

  await adminClient.from("shopify_sync_logs").insert({
    shopify_store_id: shopifyStoreDbId,
    sync_type: "orders",
    status: "success",
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    records_synced: orders.length,
    sync_date_from: dateFrom,
    sync_date_to: dateTo,
  });

  return { synced: orders.length };
}
