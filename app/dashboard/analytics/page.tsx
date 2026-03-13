import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SyncButton } from "./sync-button";
import { SeedDemoButton } from "./seed-demo-button";
import { GoogleSyncButton } from "./google-sync-button";
import { GoogleSeedDemoButton } from "./google-seed-demo-button";
import { ShopifySyncButton } from "./shopify-sync-button";
import { ShopifySeedDemoButton } from "./shopify-seed-demo-button";
import { MetricCards } from "./metric-cards";
import { CampaignTable } from "./campaign-table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface InsightRow {
  campaign_id: string;
  campaign_name: string | null;
  objective: string | null;
  impressions: number;
  clicks: number;
  spend: number;
  reach: number;
  conversions: number;
  conversion_value: number;
  date_start: string;
}

interface GoogleInsightRow {
  campaign_id: string;
  campaign_name: string | null;
  campaign_type: string | null;
  impressions: number;
  clicks: number;
  spend: number;
  reach: number;
  conversions: number;
  conversion_value: number;
  date_start: string;
}

interface ShopifyOrderRow {
  id: string;
  order_date: string;
  total_orders: number;
  total_revenue: number;
  total_refunds: number;
  net_revenue: number;
  total_items_sold: number;
  new_customers: number;
  returning_customers: number;
  avg_order_value: number;
  orders_fulfilled: number;
  orders_pending: number;
  orders_cancelled: number;
}

interface ShopifyProductRow {
  id: string;
  product_title: string;
  variant_title: string | null;
  total_quantity_sold: number;
  total_revenue: number;
  total_orders: number;
}

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch connected Meta account (may not exist)
  const { data: metaAccounts } = await supabase
    .from("meta_ad_accounts")
    .select("id, meta_account_id, meta_account_name")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1);

  const metaAccount = metaAccounts?.[0] ?? null;

  // Fetch connected Shopify store (may not exist)
  const { data: shopifyStores } = await supabase
    .from("shopify_stores")
    .select("id, shop_domain, shop_name")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1);

  const shopifyStore = shopifyStores?.[0] ?? null;

  // Fetch connected Google account (may not exist)
  const { data: googleAccounts } = await supabase
    .from("google_ad_accounts")
    .select("id, google_customer_id, google_account_name")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1);

  const googleAccount = googleAccounts?.[0] ?? null;

  // If nothing is connected, show a helpful message instead of redirecting
  if (!metaAccount && !shopifyStore && !googleAccount) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground">
            Connect a platform to start viewing analytics
          </p>
        </div>
        <Separator />
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-lg font-semibold">No platforms connected</p>
          <p className="mb-6 max-w-md text-sm text-muted-foreground">
            Go to the Dashboard and connect your Meta Ad Account, Shopify store,
            or Google Ads account to start tracking performance analytics.
          </p>
          <a href="/dashboard">
            <button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Go to Dashboard
            </button>
          </a>
        </div>
      </div>
    );
  }

  // Build a label for what's connected
  const connectedPlatforms: string[] = [];
  if (metaAccount) connectedPlatforms.push(metaAccount.meta_account_name ?? metaAccount.meta_account_id);
  if (shopifyStore) connectedPlatforms.push(shopifyStore.shop_name ?? shopifyStore.shop_domain);
  if (googleAccount) connectedPlatforms.push(googleAccount.google_account_name ?? googleAccount.google_customer_id);

  // Fetch Meta insights if account exists
  let insights: InsightRow[] = [];
  if (metaAccount) {
    const { data } = await supabase
      .from("meta_campaign_insights")
      .select("*")
      .eq("meta_ad_account_id", metaAccount.id)
      .order("date_start", { ascending: false });
    insights = (data ?? []) as InsightRow[];
  }

  // Fetch Google insights if account exists
  let googleInsights: GoogleInsightRow[] = [];
  if (googleAccount) {
    const { data } = await supabase
      .from("google_campaign_insights")
      .select("*")
      .eq("google_ad_account_id", googleAccount.id)
      .order("date_start", { ascending: false });
    googleInsights = (data ?? []) as GoogleInsightRow[];
  }

  // Fetch Shopify order analytics if store exists
  let shopifyOrders: ShopifyOrderRow[] = [];
  let shopifyProducts: ShopifyProductRow[] = [];
  if (shopifyStore) {
    const { data: orderData } = await supabase
      .from("shopify_order_analytics")
      .select("*")
      .eq("shopify_store_id", shopifyStore.id)
      .order("order_date", { ascending: false });
    shopifyOrders = (orderData ?? []) as ShopifyOrderRow[];

    const { data: productData } = await supabase
      .from("shopify_product_analytics")
      .select("*")
      .eq("shopify_store_id", shopifyStore.id)
      .order("total_revenue", { ascending: false });
    shopifyProducts = (productData ?? []) as ShopifyProductRow[];
  }

  // Shopify aggregated totals
  const shopifyTotals = shopifyOrders.reduce(
    (acc, row) => {
      acc.totalOrders += Number(row.total_orders);
      acc.totalRevenue += Number(row.total_revenue);
      acc.totalRefunds += Number(row.total_refunds);
      acc.netRevenue += Number(row.net_revenue);
      acc.itemsSold += Number(row.total_items_sold);
      acc.newCustomers += Number(row.new_customers);
      acc.returningCustomers += Number(row.returning_customers);
      return acc;
    },
    {
      totalOrders: 0,
      totalRevenue: 0,
      totalRefunds: 0,
      netRevenue: 0,
      itemsSold: 0,
      newCustomers: 0,
      returningCustomers: 0,
    },
  );

  const shopifyAov =
    shopifyTotals.totalOrders > 0
      ? shopifyTotals.totalRevenue / shopifyTotals.totalOrders
      : 0;

  // Combine all insights for aggregate totals
  const allInsights = [
    ...insights.map((r) => ({ ...r, source: "meta" as const })),
    ...googleInsights.map((r) => ({ ...r, objective: r.campaign_type, source: "google" as const })),
  ];

  // Aggregate totals across all campaigns / days
  const totals = allInsights.reduce(
    (acc, row) => {
      acc.impressions += Number(row.impressions);
      acc.clicks += Number(row.clicks);
      acc.spend += Number(row.spend);
      acc.reach += Number(row.reach);
      acc.conversions += Number(row.conversions);
      acc.conversionValue += Number(row.conversion_value);
      return acc;
    },
    {
      impressions: 0,
      clicks: 0,
      spend: 0,
      reach: 0,
      conversions: 0,
      conversionValue: 0,
    },
  );

  const ctr =
    totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
  const roas = totals.spend > 0 ? totals.conversionValue / totals.spend : 0;

  // Aggregate by campaign (summing all days)
  const campaignMap = new Map<
    string,
    {
      campaign_id: string;
      campaign_name: string;
      objective: string | null;
      impressions: number;
      clicks: number;
      spend: number;
      reach: number;
      ctr: number;
      cpc: number;
      conversions: number;
      conversionValue: number;
      costPerConversion: number;
      days: number;
    }
  >();

  for (const row of allInsights) {
    const key = `${row.source}_${row.campaign_id}`;
    const existing = campaignMap.get(key);
    if (existing) {
      existing.impressions += Number(row.impressions);
      existing.clicks += Number(row.clicks);
      existing.spend += Number(row.spend);
      existing.reach += Number(row.reach);
      existing.conversions += Number(row.conversions);
      existing.conversionValue += Number(row.conversion_value);
      existing.days += 1;
    } else {
      campaignMap.set(key, {
        campaign_id: row.campaign_id,
        campaign_name: `${row.source === "google" ? "[Google] " : "[Meta] "}${row.campaign_name ?? "Unnamed"}`,
        objective: row.objective,
        impressions: Number(row.impressions),
        clicks: Number(row.clicks),
        spend: Number(row.spend),
        reach: Number(row.reach),
        ctr: 0,
        cpc: 0,
        conversions: Number(row.conversions),
        conversionValue: Number(row.conversion_value),
        costPerConversion: 0,
        days: 1,
      });
    }
  }

  // Calculate derived metrics per campaign
  const campaigns = Array.from(campaignMap.values()).map((c) => ({
    ...c,
    ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
    cpc: c.clicks > 0 ? c.spend / c.clicks : 0,
    costPerConversion: c.conversions > 0 ? c.spend / c.conversions : 0,
  }));

  // Sort by spend descending
  campaigns.sort((a, b) => b.spend - a.spend);

  const hasData = allInsights.length > 0;
  const hasShopifyData = shopifyOrders.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground">
            Performance data for{" "}
            <span className="font-medium text-foreground">
              {connectedPlatforms.join(" & ")}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {metaAccount && <SyncButton />}
          {googleAccount && <GoogleSyncButton />}
          {shopifyStore && <ShopifySyncButton />}
        </div>
      </div>

      <Separator />

      {!hasData && !hasShopifyData ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-lg font-semibold">No insights data yet</p>
          <p className="mb-6 max-w-md text-sm text-muted-foreground">
            {metaAccount || googleAccount || shopifyStore
              ? 'Click "Sync Data" to fetch performance data, or load demo data to preview the dashboard.'
              : "Connect a platform from the Dashboard to sync analytics."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {metaAccount && <SyncButton />}
            {metaAccount && <SeedDemoButton />}
            {googleAccount && <GoogleSyncButton />}
            {googleAccount && <GoogleSeedDemoButton />}
            {shopifyStore && <ShopifySyncButton />}
            {shopifyStore && <ShopifySeedDemoButton />}
            {!metaAccount && !googleAccount && !shopifyStore && (
              <a href="/dashboard">
                <button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  Go to Dashboard
                </button>
              </a>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Ad Platform Metrics (Meta + Google) */}
          {hasData && (
            <>
              <MetricCards
                impressions={totals.impressions}
                clicks={totals.clicks}
                spend={totals.spend}
                reach={totals.reach}
                ctr={ctr}
                cpc={cpc}
                conversions={totals.conversions}
                conversionValue={totals.conversionValue}
                roas={roas}
              />

              <div>
                <h3 className="mb-4 text-lg font-semibold">Campaign Breakdown</h3>
                <CampaignTable campaigns={campaigns} />
              </div>
            </>
          )}

          {/* Shopify Order & Product Metrics */}
          {hasShopifyData && (
            <>
              <Separator />
              <h3 className="text-lg font-semibold">Shopify Store Analytics</h3>

              {/* Shopify KPI cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Orders
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {shopifyTotals.totalOrders.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Gross Revenue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      ${shopifyTotals.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Net Revenue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-600">
                      ${shopifyTotals.netRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Avg Order Value
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      ${shopifyAov.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Items Sold
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {shopifyTotals.itemsSold.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Refunds
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-red-600">
                      ${shopifyTotals.totalRefunds.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      New Customers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {shopifyTotals.newCustomers.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Returning Customers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {shopifyTotals.returningCustomers.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Product Performance Table */}
              {shopifyProducts.length > 0 && (
                <div>
                  <h3 className="mb-4 text-lg font-semibold">Top Products</h3>
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-4 py-3 text-left font-medium">Product</th>
                          <th className="px-4 py-3 text-right font-medium">Units Sold</th>
                          <th className="px-4 py-3 text-right font-medium">Revenue</th>
                          <th className="px-4 py-3 text-right font-medium">Orders</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shopifyProducts.map((p) => (
                          <tr key={p.id} className="border-b last:border-0">
                            <td className="px-4 py-3 font-medium">
                              {p.product_title}
                              {p.variant_title && (
                                <span className="ml-1 text-muted-foreground">
                                  ({p.variant_title})
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {Number(p.total_quantity_sold).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right">
                              ${Number(p.total_revenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {Number(p.total_orders).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
