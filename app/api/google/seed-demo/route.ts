import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const DEMO_CAMPAIGNS = [
  {
    id: "google_301",
    name: "Search — Brand Keywords",
    type: "SEARCH",
    baseImpressions: 15000,
    baseCtr: 5.2,
    baseSpend: 180,
    conversionRate: 0.045,
    avgOrderValue: 78,
  },
  {
    id: "google_302",
    name: "Display — Remarketing",
    type: "DISPLAY",
    baseImpressions: 45000,
    baseCtr: 0.6,
    baseSpend: 95,
    conversionRate: 0.012,
    avgOrderValue: 55,
  },
  {
    id: "google_303",
    name: "Shopping — Product Feed",
    type: "SHOPPING",
    baseImpressions: 28000,
    baseCtr: 2.1,
    baseSpend: 21110,
    conversionRate: 0.038,
    avgOrderValue: 92,
  },
  {
    id: "google_304",
    name: "YouTube — Video Campaign",
    type: "VIDEO",
    baseImpressions: 60000,
    baseCtr: 0.4,
    baseSpend: 150,
    conversionRate: 0.006,
    avgOrderValue: 45,
  },
  {
    id: "google_305",
    name: "Performance Max — All Channels",
    type: "PERFORMANCE_MAX",
    baseImpressions: 35000,
    baseCtr: 1.8,
    baseSpend: 250,
    conversionRate: 0.042,
    avgOrderValue: 85,
  },
];

function randomVariation(base: number, variance: number): number {
  return base * (1 + (Math.random() - 0.5) * 2 * variance);
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

  const { data: accounts } = await adminClient
    .from("google_ad_accounts")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1);

  const account = accounts?.[0];
  if (!account) {
    return NextResponse.json(
      { error: "No connected Google ad account. Connect Google Ads first." },
      { status: 404 },
    );
  }

  const rows = [];
  const now = new Date();

  for (const campaign of DEMO_CAMPAIGNS) {
    for (let d = 29; d >= 0; d--) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      const dateStr = date.toISOString().split("T")[0];

      const dayOfWeek = date.getDay();
      const weekendFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 0.75 : 1.0;
      const trendFactor = 1 + (30 - d) * 0.005;

      const impressions = Math.round(
        randomVariation(campaign.baseImpressions, 0.2) * weekendFactor * trendFactor,
      );
      const ctrActual = randomVariation(campaign.baseCtr, 0.15) / 100;
      const clicks = Math.max(1, Math.round(impressions * ctrActual));
      const spend =
        Math.round(randomVariation(campaign.baseSpend, 0.18) * weekendFactor * trendFactor * 100) / 100;

      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const cpc = clicks > 0 ? Math.round((spend / clicks) * 10000) / 10000 : 0;
      const cpm = impressions > 0 ? Math.round((spend / impressions) * 1000 * 10000) / 10000 : 0;

      const conversions = Math.max(
        0,
        Math.round(clicks * randomVariation(campaign.conversionRate, 0.25)),
      );
      const conversionValue =
        Math.round(conversions * randomVariation(campaign.avgOrderValue, 0.15) * 100) / 100;
      const costPerConversion =
        conversions > 0 ? Math.round((spend / conversions) * 10000) / 10000 : 0;

      rows.push({
        google_ad_account_id: account.id,
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        date_start: dateStr,
        date_stop: dateStr,
        impressions,
        clicks,
        spend,
        reach: 0,
        ctr: Math.round(ctr * 10000) / 10000,
        cpc,
        cpm,
        conversions,
        conversion_value: conversionValue,
        cost_per_conversion: costPerConversion,
        campaign_status: "ENABLED",
        campaign_type: campaign.type,
      });
    }
  }

  const batchSize = 100;
  let totalInserted = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await adminClient
      .from("google_campaign_insights")
      .upsert(batch, { onConflict: "google_ad_account_id,campaign_id,date_start" });

    if (error) {
      return NextResponse.json(
        { error: `Upsert failed: ${error.message}`, inserted_so_far: totalInserted },
        { status: 500 },
      );
    }
    totalInserted += batch.length;
  }

  await adminClient.from("google_sync_logs").insert({
    google_ad_account_id: account.id,
    sync_type: "insights",
    status: "success",
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    records_synced: rows.length,
    sync_date_from: rows[0].date_start,
    sync_date_to: rows[rows.length - 1].date_start,
  });

  return NextResponse.json({
    success: true,
    campaigns: DEMO_CAMPAIGNS.length,
    days: 30,
    total_rows: totalInserted,
  });
}
