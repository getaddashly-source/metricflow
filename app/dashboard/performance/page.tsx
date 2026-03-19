import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PerformanceClientView } from "./performance-client-view";

type MetaRow = {
  date_start: string;
  impressions: number;
  spend: number;
  conversions: number;
  conversion_value: number;
};

type GoogleRow = {
  date_start: string;
  impressions: number;
  spend: number;
  conversions: number;
  conversion_value: number;
};

type ShopifyRow = {
  order_date: string;
  net_revenue: number;
  total_orders: number;
};

export default async function PerformancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: metaAccounts } = await supabase
    .from("meta_ad_accounts")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1);

  const { data: googleAccounts } = await supabase
    .from("google_ad_accounts")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1);

  const { data: shopifyStores } = await supabase
    .from("shopify_stores")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1);

  const metaId = metaAccounts?.[0]?.id;
  const googleId = googleAccounts?.[0]?.id;
  const shopifyId = shopifyStores?.[0]?.id;

  let metaRows: MetaRow[] = [];
  if (metaId) {
    const { data } = await supabase
      .from("meta_campaign_insights")
      .select("date_start, impressions, spend, conversions, conversion_value")
      .eq("meta_ad_account_id", metaId)
      .order("date_start", { ascending: true });
    metaRows = (data ?? []) as MetaRow[];
  }

  let googleRows: GoogleRow[] = [];
  if (googleId) {
    const { data } = await supabase
      .from("google_campaign_insights")
      .select("date_start, impressions, spend, conversions, conversion_value")
      .eq("google_ad_account_id", googleId)
      .order("date_start", { ascending: true });
    googleRows = (data ?? []) as GoogleRow[];
  }

  let shopifyRows: ShopifyRow[] = [];
  if (shopifyId) {
    const { data } = await supabase
      .from("shopify_order_analytics")
      .select("order_date, net_revenue, total_orders")
      .eq("shopify_store_id", shopifyId)
      .order("order_date", { ascending: true });
    shopifyRows = (data ?? []) as ShopifyRow[];
  }

  return (
    <PerformanceClientView
      metaRows={metaRows}
      googleRows={googleRows}
      shopifyRows={shopifyRows}
    />
  );
}
