import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ShopifyConnectForm } from "@/app/dashboard/shopify-connect-form";
import { ShopifyChannelView } from "./shopify-channel-view";

const DEMO_CLIENT_ID = "demo-client";

type ShopifyOrderRow = {
  order_date: string;
  net_revenue: number;
  total_orders: number;
};

type ShopifyProductRow = {
  product_title: string;
  total_revenue: number;
  total_orders: number;
};

export default async function ShopifyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: stores } = await supabase
    .from("shopify_stores")
    .select("id, client_id, shop_domain, shop_name")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1);

  const store = stores?.[0];
  if (!store) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center">
        <p className="text-xl font-semibold text-zinc-900">No Shopify store connected</p>
        <p className="mx-auto mt-2 mb-6 max-w-lg text-sm text-zinc-600">
          Connect your Shopify store to sync orders, revenue, and top product performance.
        </p>
        <div className="flex items-center justify-center">
          <ShopifyConnectForm clientId={DEMO_CLIENT_ID} />
        </div>
      </div>
    );
  }

  const { data: orderData } = await supabase
    .from("shopify_order_analytics")
    .select("order_date, net_revenue, total_orders")
    .eq("shopify_store_id", store.id)
    .order("order_date", { ascending: true });

  const { data: productData } = await supabase
    .from("shopify_product_analytics")
    .select("product_title, total_revenue, total_orders")
    .eq("shopify_store_id", store.id)
    .order("total_revenue", { ascending: false })
    .limit(10);

  return (
    <ShopifyChannelView
      clientId={store.client_id ?? DEMO_CLIENT_ID}
      storeLabel={store.shop_name ?? store.shop_domain}
      orders={(orderData ?? []) as ShopifyOrderRow[]}
      products={(productData ?? []) as ShopifyProductRow[]}
    />
  );
}
