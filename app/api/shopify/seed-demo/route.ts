import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const DEMO_PRODUCTS = [
  { id: "prod_001", title: "Classic Cotton T-Shirt", avgPrice: 29.99 },
  { id: "prod_002", title: "Premium Denim Jeans", avgPrice: 79.99 },
  { id: "prod_003", title: "Leather Crossbody Bag", avgPrice: 124.99 },
  { id: "prod_004", title: "Running Sneakers Pro", avgPrice: 149.99 },
  { id: "prod_005", title: "Wool Blend Sweater", avgPrice: 64.99 },
  { id: "prod_006", title: "Silk Scarf", avgPrice: 44.99 },
  { id: "prod_007", title: "Canvas Backpack", avgPrice: 59.99 },
  { id: "prod_008", title: "Stainless Watch", avgPrice: 199.99 },
];

function randomVariation(base: number, variance: number): number {
  return base * (1 + (Math.random() - 0.5) * 2 * variance);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createAdminClient();

  const { data: stores } = await adminClient
    .from("shopify_stores")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1);

  const store = stores?.[0];
  if (!store) {
    return NextResponse.json(
      { error: "No connected Shopify store. Connect Shopify first." },
      { status: 404 },
    );
  }

  const orderRows = [];
  const now = new Date();

  for (let d = 29; d >= 0; d--) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    const dateStr = date.toISOString().split("T")[0];

    const dayOfWeek = date.getDay();
    const weekendFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 1.3 : 1.0;
    const trendFactor = 1 + (30 - d) * 0.008;

    const baseOrders = Math.round(randomVariation(18, 0.25) * weekendFactor * trendFactor);
    const totalOrders = Math.max(1, baseOrders);

    // Calculate revenue from random product picks
    let totalRevenue = 0;
    let totalItems = 0;
    for (let o = 0; o < totalOrders; o++) {
      const itemsInOrder = randomInt(1, 4);
      for (let i = 0; i < itemsInOrder; i++) {
        const product = DEMO_PRODUCTS[randomInt(0, DEMO_PRODUCTS.length - 1)];
        totalRevenue += randomVariation(product.avgPrice, 0.1);
        totalItems += 1;
      }
    }

    totalRevenue = Math.round(totalRevenue * 100) / 100;
    const refundRate = randomVariation(0.04, 0.5);
    const totalRefunds = Math.round(totalRevenue * refundRate * 100) / 100;
    const netRevenue = Math.round((totalRevenue - totalRefunds) * 100) / 100;
    const avgOrderValue = Math.round((totalRevenue / totalOrders) * 100) / 100;

    const newCustomerRate = randomVariation(0.35, 0.2);
    const newCustomers = Math.round(totalOrders * newCustomerRate);
    const returningCustomers = totalOrders - newCustomers;

    const cancelRate = randomVariation(0.03, 0.5);
    const ordersCancelled = Math.max(0, Math.round(totalOrders * cancelRate));
    const remainingOrders = totalOrders - ordersCancelled;
    const fulfillRate = randomVariation(0.85, 0.1);
    const ordersFulfilled = Math.round(remainingOrders * fulfillRate);
    const ordersPending = remainingOrders - ordersFulfilled;

    orderRows.push({
      shopify_store_id: store.id,
      order_date: dateStr,
      total_orders: totalOrders,
      total_revenue: totalRevenue,
      total_refunds: totalRefunds,
      net_revenue: netRevenue,
      total_items_sold: totalItems,
      avg_order_value: avgOrderValue,
      new_customers: newCustomers,
      returning_customers: returningCustomers,
      orders_fulfilled: ordersFulfilled,
      orders_pending: ordersPending,
      orders_cancelled: ordersCancelled,
    });
  }

  // Upsert order analytics
  const batchSize = 100;
  let totalInserted = 0;

  for (let i = 0; i < orderRows.length; i += batchSize) {
    const batch = orderRows.slice(i, i + batchSize);
    const { error } = await adminClient
      .from("shopify_order_analytics")
      .upsert(batch, { onConflict: "shopify_store_id,order_date" });

    if (error) {
      return NextResponse.json(
        { error: `Order upsert failed: ${error.message}`, inserted_so_far: totalInserted },
        { status: 500 },
      );
    }
    totalInserted += batch.length;
  }

  // Seed product analytics
  const now30Ago = new Date(now);
  now30Ago.setDate(now30Ago.getDate() - 29);
  const dateFrom = now30Ago.toISOString().split("T")[0];
  const dateTo = now.toISOString().split("T")[0];

  const productRows = DEMO_PRODUCTS.map((product) => {
    const totalQty = randomInt(40, 200);
    const perItemRevenue = randomVariation(product.avgPrice, 0.1);
    return {
      shopify_store_id: store.id,
      product_id: product.id,
      product_title: product.title,
      variant_title: "Default",
      total_quantity_sold: totalQty,
      total_revenue: Math.round(totalQty * perItemRevenue * 100) / 100,
      total_orders: randomInt(30, totalQty),
      date_from: dateFrom,
      date_to: dateTo,
    };
  });

  const { error: prodError } = await adminClient
    .from("shopify_product_analytics")
    .upsert(productRows, { onConflict: "shopify_store_id,product_id,date_from" });

  if (prodError) {
    console.error("[shopify/seed-demo] Product upsert error:", prodError.message);
  }

  // Log the sync
  await adminClient.from("shopify_sync_logs").insert({
    shopify_store_id: store.id,
    sync_type: "orders",
    status: "success",
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    records_synced: totalInserted,
    sync_date_from: dateFrom,
    sync_date_to: dateTo,
  });

  return NextResponse.json({
    success: true,
    days: 30,
    total_order_rows: totalInserted,
    total_product_rows: productRows.length,
  });
}
