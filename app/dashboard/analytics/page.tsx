import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SyncButton } from "./sync-button";
import { SeedDemoButton } from "./seed-demo-button";
import { GoogleSyncButton } from "./google-sync-button";
import { GoogleSeedDemoButton } from "./google-seed-demo-button";
import { ShopifySyncButton } from "./shopify-sync-button";
import { ShopifySeedDemoButton } from "./shopify-seed-demo-button";
import { AnalyticsDashboardShell } from "./analytics-dashboard-shell";

interface InsightRow {
  campaign_id: string;
  campaign_name: string | null;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  conversion_value: number;
  date_start: string;
}

interface GoogleInsightRow {
  campaign_id: string;
  campaign_name: string | null;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  conversion_value: number;
  date_start: string;
}

interface ShopifyOrderRow {
  id: string;
  order_date: string;
  total_revenue: number;
  net_revenue: number;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const range = params.range === "1" || params.range === "30" ? params.range : "7";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: metaAccounts } = await supabase
    .from("meta_ad_accounts")
    .select("id, meta_account_id, meta_account_name")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1);

  const { data: shopifyStores } = await supabase
    .from("shopify_stores")
    .select("id, shop_domain, shop_name")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1);

  const { data: googleAccounts } = await supabase
    .from("google_ad_accounts")
    .select("id, google_customer_id, google_account_name")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1);

  const metaAccount = metaAccounts?.[0] ?? null;
  const shopifyStore = shopifyStores?.[0] ?? null;
  const googleAccount = googleAccounts?.[0] ?? null;

  if (!metaAccount && !shopifyStore && !googleAccount) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Connect at least one channel to start analytics</p>
        </div>
        <Separator />
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-10 text-center">
          <p className="text-xl font-semibold text-zinc-900">No channels connected yet</p>
          <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-600">
            Start with Meta Ads, Google Ads, or Shopify from Dashboard to populate this performance view.
          </p>
          <a
            href="/dashboard"
            className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Open Connection Center
          </a>
        </div>
      </div>
    );
  }

  let insights: InsightRow[] = [];
  if (metaAccount) {
    const { data } = await supabase
      .from("meta_campaign_insights")
      .select("campaign_id, campaign_name, impressions, clicks, spend, conversions, conversion_value, date_start")
      .eq("meta_ad_account_id", metaAccount.id)
      .order("date_start", { ascending: true });
    insights = (data ?? []) as InsightRow[];
  }

  let googleInsights: GoogleInsightRow[] = [];
  if (googleAccount) {
    const { data } = await supabase
      .from("google_campaign_insights")
      .select("campaign_id, campaign_name, impressions, clicks, spend, conversions, conversion_value, date_start")
      .eq("google_ad_account_id", googleAccount.id)
      .order("date_start", { ascending: true });
    googleInsights = (data ?? []) as GoogleInsightRow[];
  }

  let shopifyOrders: ShopifyOrderRow[] = [];
  if (shopifyStore) {
    const { data } = await supabase
      .from("shopify_order_analytics")
      .select("id, order_date, total_revenue, net_revenue")
      .eq("shopify_store_id", shopifyStore.id)
      .order("order_date", { ascending: true });
    shopifyOrders = (data ?? []) as ShopifyOrderRow[];
  }

  const hasData =
    insights.length > 0 || googleInsights.length > 0 || shopifyOrders.length > 0;

  const connectedPlatforms: string[] = [];
  if (metaAccount) connectedPlatforms.push(metaAccount.meta_account_name ?? metaAccount.meta_account_id);
  if (googleAccount) connectedPlatforms.push(googleAccount.google_account_name ?? googleAccount.google_customer_id);
  if (shopifyStore) connectedPlatforms.push(shopifyStore.shop_name ?? shopifyStore.shop_domain);

  if (!hasData) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Dashboard</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Performance overview for {connectedPlatforms.join(" • ")}
          </p>
        </div>
        <Separator />
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-10 text-center">
          <p className="text-xl font-semibold text-zinc-900">No insights yet</p>
          <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-600">
            Sync your live channels or seed demo data to render this dashboard.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {metaAccount && <SyncButton />}
            {metaAccount && <SeedDemoButton />}
            {googleAccount && <GoogleSyncButton />}
            {googleAccount && <GoogleSeedDemoButton />}
            {shopifyStore && <ShopifySyncButton />}
            {shopifyStore && <ShopifySeedDemoButton />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <AnalyticsDashboardShell
      connectedPlatforms={connectedPlatforms}
      insights={insights}
      googleInsights={googleInsights}
      shopifyOrders={shopifyOrders}
      range={range}
    />
  );
}
