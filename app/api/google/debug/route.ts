import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptGoogleToken } from "@/lib/google/encryption";
import { getValidAccessToken } from "@/lib/google/insights";

export async function GET() {
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
    .select(
      `id, google_customer_id, google_account_name,
       google_tokens ( access_token_enc, refresh_token_enc, token_expires_at )`,
    )
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1);

  const account = accounts?.[0];
  if (!account) {
    return NextResponse.json({ error: "No connected Google account" }, { status: 404 });
  }

  const token = Array.isArray(account.google_tokens)
    ? account.google_tokens[0]
    : account.google_tokens;

  if (!token?.access_token_enc || !token?.refresh_token_enc) {
    return NextResponse.json({ error: "No token found" }, { status: 404 });
  }

  let accessToken: string;
  try {
    accessToken = await getValidAccessToken(
      account.id,
      token.access_token_enc,
      token.refresh_token_enc,
      token.token_expires_at,
    );
  } catch (err) {
    return NextResponse.json({
      error: `Token refresh failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    }, { status: 500 });
  }

  const customerId = account.google_customer_id.replace(/-/g, "");
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? "";

  // Fetch campaigns
  const campaignsQuery = `
    SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
           campaign.bidding_strategy_type
    FROM campaign
    WHERE campaign.status != 'REMOVED'
    ORDER BY campaign.name
    LIMIT 20
  `.trim();

  const campaignsRes = await fetch(
    `https://googleads.googleapis.com/v17/customers/${customerId}/googleAds:search`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "developer-token": developerToken,
        "Content-Type": "application/json",
        ...(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID
          ? { "login-customer-id": process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID.replace(/-/g, "") }
          : {}),
      },
      body: JSON.stringify({ query: campaignsQuery }),
    },
  );
  const campaignsBody = await campaignsRes.json();

  // Fetch recent insights
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateFrom = thirtyDaysAgo.toISOString().split("T")[0];
  const dateTo = now.toISOString().split("T")[0];

  const insightsQuery = `
    SELECT campaign.id, campaign.name,
           metrics.impressions, metrics.clicks, metrics.cost_micros,
           metrics.conversions, metrics.conversions_value,
           segments.date
    FROM campaign
    WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
      AND campaign.status != 'REMOVED'
    ORDER BY segments.date DESC
    LIMIT 10
  `.trim();

  const insightsRes = await fetch(
    `https://googleads.googleapis.com/v17/customers/${customerId}/googleAds:search`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "developer-token": developerToken,
        "Content-Type": "application/json",
        ...(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID
          ? { "login-customer-id": process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID.replace(/-/g, "") }
          : {}),
      },
      body: JSON.stringify({ query: insightsQuery }),
    },
  );
  const insightsBody = await insightsRes.json();

  const { data: syncLogs } = await adminClient
    .from("google_sync_logs")
    .select("*")
    .eq("google_ad_account_id", account.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return NextResponse.json({
    account: {
      db_id: account.id,
      google_customer_id: account.google_customer_id,
      name: account.google_account_name,
      token_expires: token.token_expires_at,
    },
    campaigns: campaignsBody,
    insights: insightsBody,
    recent_sync_logs: syncLogs,
  });
}
