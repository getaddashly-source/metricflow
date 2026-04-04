import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/meta/seed-demo
 *
 * Seeds realistic demo campaign insights data for the authenticated user's
 * connected Meta ad account. Generates 5 campaigns × 30 days of data.
 *
 * This is for development/demo purposes only.
 */

const DEMO_CAMPAIGNS = [
  {
    id: "120210001",
    name: "Advantage+ Shopping - Broad Prospecting",
    objective: "OUTCOME_SALES",
    baseImpressions: 14000,
    baseCtr: 1.9,
    baseSpend: 165,
    conversionRate: 0.026,
    avgValuePerConversion: 72,
    status: "ACTIVE",
  },
  {
    id: "120210002",
    name: "Reels Awareness - Video Viewers",
    objective: "OUTCOME_AWARENESS",
    baseImpressions: 30000,
    baseCtr: 0.65,
    baseSpend: 95,
    conversionRate: 0.002,
    avgValuePerConversion: 0,
    status: "ACTIVE",
  },
  {
    id: "120210003",
    name: "Catalog Sales - Retargeting 14D Viewers",
    objective: "OUTCOME_SALES",
    baseImpressions: 6200,
    baseCtr: 3.8,
    baseSpend: 110,
    conversionRate: 0.061,
    avgValuePerConversion: 104,
    status: "ACTIVE",
  },
  {
    id: "120210004",
    name: "Instant Forms - Quote Requests",
    objective: "OUTCOME_LEADS",
    baseImpressions: 16500,
    baseCtr: 1.35,
    baseSpend: 120,
    conversionRate: 0.022,
    avgValuePerConversion: 18,
    status: "ACTIVE",
  },
  {
    id: "120210005",
    name: "Click to WhatsApp - Local Leads",
    objective: "OUTCOME_TRAFFIC",
    baseImpressions: 21000,
    baseCtr: 1.75,
    baseSpend: 88,
    conversionRate: 0.011,
    avgValuePerConversion: 7,
    status: "PAUSED",
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

  // Get connected account
  const { data: accounts } = await adminClient
    .from("meta_ad_accounts")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1);

  const account = accounts?.[0];
  if (!account) {
    return NextResponse.json(
      { error: "No connected ad account. Connect Meta Ads first." },
      { status: 404 },
    );
  }

  // Generate 30 days of data for each campaign
  const rows = [];
  const now = new Date();

  for (const campaign of DEMO_CAMPAIGNS) {
    for (let d = 29; d >= 0; d--) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      const dateStr = date.toISOString().split("T")[0];

      // Add day-of-week variation (weekends slightly lower)
      const dayOfWeek = date.getDay();
      const weekendFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 0.75 : 1.0;

      // Add a slight upward trend over time
      const trendFactor = 1 + (30 - d) * 0.005;

      const impressions = Math.round(
        randomVariation(campaign.baseImpressions, 0.2) *
          weekendFactor *
          trendFactor,
      );
      const ctrActual = randomVariation(campaign.baseCtr, 0.15) / 100;
      const clicks = Math.max(1, Math.round(impressions * ctrActual));
      const spend = Math.round(
        randomVariation(campaign.baseSpend, 0.18) *
          weekendFactor *
          trendFactor *
          100,
      ) / 100;

      const reach = Math.round(impressions * randomVariation(0.82, 0.05));
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const cpc = clicks > 0 ? Math.round((spend / clicks) * 10000) / 10000 : 0;
      const cpm = impressions > 0 ? Math.round((spend / impressions) * 1000 * 10000) / 10000 : 0;

      const conversionsBase = Math.max(
        0,
        Math.round(clicks * randomVariation(campaign.conversionRate, 0.25)),
      );

      // Keep conversion behavior aligned with Meta objectives.
      const conversions =
        campaign.objective === "OUTCOME_AWARENESS"
          ? Math.round(conversionsBase * 0.3)
          : conversionsBase;

      const conversionValue =
        campaign.avgValuePerConversion > 0
          ? Math.round(
              conversions *
                randomVariation(campaign.avgValuePerConversion, 0.18) *
                100,
            ) / 100
          : 0;
      const costPerConversion =
        conversions > 0
          ? Math.round((spend / conversions) * 10000) / 10000
          : 0;

      rows.push({
        meta_ad_account_id: account.id,
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        date_start: dateStr,
        date_stop: dateStr,
        impressions,
        clicks,
        spend,
        reach,
        ctr: Math.round(ctr * 10000) / 10000,
        cpc,
        cpm,
        conversions,
        conversion_value: conversionValue,
        cost_per_conversion: costPerConversion,
        campaign_status: campaign.status,
        objective: campaign.objective,
      });
    }
  }

  // Upsert in batches (Supabase has a ~1000 row limit per request)
  const batchSize = 100;
  let totalInserted = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await adminClient
      .from("meta_campaign_insights")
      .upsert(batch, {
        onConflict: "meta_ad_account_id,campaign_id,date_start",
      });

    if (error) {
      return NextResponse.json(
        { error: `Upsert failed: ${error.message}`, inserted_so_far: totalInserted },
        { status: 500 },
      );
    }
    totalInserted += batch.length;
  }

  // Log as a demo sync
  await adminClient.from("meta_sync_logs").insert({
    meta_ad_account_id: account.id,
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
