import { decryptGoogleToken, encryptGoogleToken } from "@/lib/google/encryption";
import { createAdminClient } from "@/lib/supabase/admin";

const GOOGLE_ADS_API_BASE = "https://googleads.googleapis.com/v17";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export interface GoogleCampaignInsight {
  campaign_id: string;
  campaign_name: string;
  date: string;
  impressions: number;
  clicks: number;
  cost_micros: number;
  conversions: number;
  conversions_value: number;
  campaign_status: string;
  campaign_type: string;
}

interface GoogleAdsRow {
  campaign: {
    id: string;
    name: string;
    status: string;
    advertisingChannelType: string;
  };
  metrics: {
    impressions: string;
    clicks: string;
    costMicros: string;
    conversions: string;
    conversionsValue: string;
    ctr: string;
    averageCpc: string;
    averageCpm: string;
  };
  segments: {
    date: string;
  };
}

interface GoogleAdsResponse {
  results?: GoogleAdsRow[];
  nextPageToken?: string;
}

function env(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

async function refreshAccessToken(
  refreshTokenEnc: string,
): Promise<{ access_token: string; expires_in: number }> {
  const refreshToken = decryptGoogleToken(refreshTokenEnc);

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("GOOGLE_CLIENT_ID"),
      client_secret: env("GOOGLE_CLIENT_SECRET"),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const body = await res.json();

  if (!res.ok || !body.access_token) {
    throw new Error(
      `Google token refresh failed: ${body.error_description ?? body.error ?? res.statusText}`,
    );
  }

  return { access_token: body.access_token, expires_in: body.expires_in };
}

export async function getValidAccessToken(
  googleAdAccountDbId: string,
  encryptedAccessToken: string,
  encryptedRefreshToken: string,
  tokenExpiresAt: string,
): Promise<string> {
  const adminClient = createAdminClient();

  // If token is still valid (with 5 min buffer), use it
  if (new Date(tokenExpiresAt) > new Date(Date.now() + 5 * 60 * 1000)) {
    return decryptGoogleToken(encryptedAccessToken);
  }

  // Otherwise refresh
  const { access_token, expires_in } = await refreshAccessToken(encryptedRefreshToken);
  const newExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

  await adminClient.from("google_tokens").update({
    access_token_enc: encryptGoogleToken(access_token),
    token_expires_at: newExpiresAt,
    last_refreshed_at: new Date().toISOString(),
    refresh_error: null,
  }).eq("google_ad_account_id", googleAdAccountDbId);

  return access_token;
}

export async function fetchCampaignInsights(
  accessToken: string,
  customerId: string,
  dateFrom: string,
  dateTo: string,
): Promise<GoogleCampaignInsight[]> {
  const allInsights: GoogleCampaignInsight[] = [];
  // Remove dashes from customer ID for API call
  const cleanCustomerId = customerId.replace(/-/g, "");

  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value,
      metrics.ctr,
      metrics.average_cpc,
      metrics.average_cpm,
      segments.date
    FROM campaign
    WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
      AND campaign.status != 'REMOVED'
    ORDER BY segments.date DESC
  `.trim();

  let pageToken: string | null = null;

  do {
    const url = `${GOOGLE_ADS_API_BASE}/customers/${cleanCustomerId}/googleAds:searchStream`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "developer-token": env("GOOGLE_ADS_DEVELOPER_TOKEN"),
        "Content-Type": "application/json",
        ...(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID
          ? { "login-customer-id": process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID.replace(/-/g, "") }
          : {}),
      },
      body: JSON.stringify({ query }),
    });

    const body = await res.json();

    if (!res.ok || body.error) {
      throw new Error(
        `Google Ads API error: ${body.error?.message ?? JSON.stringify(body.error) ?? res.statusText}`,
      );
    }

    // searchStream returns an array of result batches
    const batches = Array.isArray(body) ? body : [body];

    for (const batch of batches) {
      if (batch.results) {
        for (const row of batch.results as GoogleAdsRow[]) {
          allInsights.push({
            campaign_id: row.campaign.id,
            campaign_name: row.campaign.name,
            date: row.segments.date,
            impressions: parseInt(row.metrics.impressions, 10),
            clicks: parseInt(row.metrics.clicks, 10),
            cost_micros: parseInt(row.metrics.costMicros, 10),
            conversions: Math.round(parseFloat(row.metrics.conversions)),
            conversions_value: parseFloat(row.metrics.conversionsValue),
            campaign_status: row.campaign.status,
            campaign_type: row.campaign.advertisingChannelType,
          });
        }
      }
    }

    pageToken = null; // searchStream doesn't paginate — returns all at once
  } while (pageToken);

  return allInsights;
}

export async function syncInsightsForAccount(
  googleAdAccountDbId: string,
  googleCustomerId: string,
  encryptedAccessToken: string,
  encryptedRefreshToken: string,
  tokenExpiresAt: string,
  dateFrom: string,
  dateTo: string,
): Promise<{ synced: number; error?: string }> {
  const adminClient = createAdminClient();

  let accessToken: string;
  try {
    accessToken = await getValidAccessToken(
      googleAdAccountDbId,
      encryptedAccessToken,
      encryptedRefreshToken,
      tokenExpiresAt,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Token refresh failed";
    await adminClient.from("google_sync_logs").insert({
      google_ad_account_id: googleAdAccountDbId,
      sync_type: "insights",
      status: "failed",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      error_message: message,
      sync_date_from: dateFrom,
      sync_date_to: dateTo,
    });
    return { synced: 0, error: message };
  }

  let insights: GoogleCampaignInsight[];
  try {
    insights = await fetchCampaignInsights(accessToken, googleCustomerId, dateFrom, dateTo);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await adminClient.from("google_sync_logs").insert({
      google_ad_account_id: googleAdAccountDbId,
      sync_type: "insights",
      status: "failed",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      error_message: message,
      sync_date_from: dateFrom,
      sync_date_to: dateTo,
    });
    return { synced: 0, error: message };
  }

  if (insights.length === 0) return { synced: 0 };

  const rows = insights.map((i) => {
    const spend = i.cost_micros / 1_000_000; // Google reports cost in micros
    const ctr = i.impressions > 0 ? (i.clicks / i.impressions) * 100 : 0;
    const cpc = i.clicks > 0 ? spend / i.clicks : 0;
    const cpm = i.impressions > 0 ? (spend / i.impressions) * 1000 : 0;
    return {
      google_ad_account_id: googleAdAccountDbId,
      campaign_id: i.campaign_id,
      campaign_name: i.campaign_name,
      date_start: i.date,
      date_stop: i.date,
      impressions: i.impressions,
      clicks: i.clicks,
      spend: Math.round(spend * 100) / 100,
      reach: 0, // Google Ads doesn't have a direct reach metric at campaign level
      ctr: Math.round(ctr * 10000) / 10000,
      cpc: Math.round(cpc * 10000) / 10000,
      cpm: Math.round(cpm * 10000) / 10000,
      conversions: i.conversions,
      conversion_value: Math.round(i.conversions_value * 100) / 100,
      cost_per_conversion: i.conversions > 0 ? Math.round((spend / i.conversions) * 10000) / 10000 : 0,
      campaign_status: i.campaign_status,
      campaign_type: i.campaign_type,
    };
  });

  const { error: upsertError } = await adminClient
    .from("google_campaign_insights")
    .upsert(rows, { onConflict: "google_ad_account_id,campaign_id,date_start" });

  if (upsertError) {
    await adminClient.from("google_sync_logs").insert({
      google_ad_account_id: googleAdAccountDbId,
      sync_type: "insights",
      status: "failed",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      error_message: upsertError.message,
      sync_date_from: dateFrom,
      sync_date_to: dateTo,
    });
    return { synced: 0, error: upsertError.message };
  }

  await adminClient.from("google_sync_logs").insert({
    google_ad_account_id: googleAdAccountDbId,
    sync_type: "insights",
    status: "success",
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    records_synced: rows.length,
    sync_date_from: dateFrom,
    sync_date_to: dateTo,
  });

  return { synced: rows.length };
}
