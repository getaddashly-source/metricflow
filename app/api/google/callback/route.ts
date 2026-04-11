import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptGoogleToken } from "@/lib/google/encryption";

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface GoogleCustomerClient {
  resourceName: string;
  clientCustomer: string;
  descriptiveName: string;
  id: string;
  level: number;
}

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const DASHBOARD_PATH = "/dashboard";

function env(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function dashboardRedirect(
  request: NextRequest,
  params: Record<string, string>,
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = DASHBOARD_PATH;
  url.search = "";
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

function googleAdsApiBase(): string {
  const version = process.env.GOOGLE_ADS_API_VERSION ?? "v20";
  return `https://googleads.googleapis.com/${version}`;
}

async function parseJsonResponse(
  res: Response,
  context: string,
): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const snippet = text.slice(0, 200).replace(/\s+/g, " ").trim();
    throw new Error(
      `${context} returned non-JSON response (${res.status}): ${snippet || "<empty>"}`,
    );
  }
}

async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env("GOOGLE_CLIENT_ID"),
      client_secret: env("GOOGLE_CLIENT_SECRET"),
      redirect_uri: env("GOOGLE_REDIRECT_URI"),
      grant_type: "authorization_code",
    }),
  });

  const body = await res.json();

  if (!res.ok || !body.access_token) {
    throw new Error(
      `Google token exchange failed: ${body.error_description ?? body.error ?? res.statusText}`,
    );
  }
  return body as GoogleTokenResponse;
}

async function fetchAccessibleCustomers(
  accessToken: string,
): Promise<string[]> {
  const url = `${googleAdsApiBase()}/customers:listAccessibleCustomers`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "developer-token": env("GOOGLE_ADS_DEVELOPER_TOKEN"),
      "Accept": "application/json",
    },
  });

  const body = await parseJsonResponse(res, "Google accessible customers endpoint");

  if (!res.ok) {
    const error = body.error as { message?: string } | undefined;
    throw new Error(
      `Failed to fetch accessible customers: ${error?.message ?? res.statusText}`,
    );
  }

  // Returns { resourceNames: ["customers/1234567890", ...] }
  const resourceNames = Array.isArray(body.resourceNames)
    ? body.resourceNames
    : [];
  return resourceNames
    .filter((rn): rn is string => typeof rn === "string")
    .map((rn) => rn.replace("customers/", ""));
}

async function fetchCustomerInfo(
  accessToken: string,
  customerId: string,
): Promise<{ id: string; name: string; managerCustomerId?: string }> {
  const cleanId = customerId.replace(/-/g, "");

  const query = `
    SELECT customer.id, customer.descriptive_name, customer.manager
    FROM customer
    LIMIT 1
  `.trim();

  const url = `${googleAdsApiBase()}/customers/${cleanId}/googleAds:search`;

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

  const body = await parseJsonResponse(res, "Google customer info endpoint");

  if (!res.ok) {
    // If we can't get info for this customer, return basic info
    return { id: cleanId, name: `Account ${cleanId}` };
  }

  const results = Array.isArray(body.results)
    ? (body.results as Array<{ customer?: { id: string; descriptiveName?: string; manager?: boolean } }>)
    : [];
  const row = results[0];
  if (row?.customer) {
    return {
      id: row.customer.id,
      name: row.customer.descriptiveName ?? `Account ${row.customer.id}`,
      managerCustomerId: row.customer.manager ? row.customer.id : undefined,
    };
  }

  return { id: cleanId, name: `Account ${cleanId}` };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    const errorDesc = searchParams.get("error_description") ?? "Unknown error from Google";
    console.error("[google/callback] OAuth denied:", errorParam, errorDesc);
    return dashboardRedirect(request, {
      google_error: "access_denied",
      message: errorDesc,
    });
  }

  if (!code || !state) {
    return dashboardRedirect(request, {
      google_error: "invalid_request",
      message: "Missing code or state parameter",
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return dashboardRedirect(request, {
      google_error: "unauthorized",
      message: "Session expired — please log in and try again",
    });
  }

  const { data: oauthState, error: stateError } = await supabase
    .from("google_oauth_states")
    .select("id, user_id, client_id, expires_at")
    .eq("state", state)
    .eq("user_id", user.id)
    .maybeSingle();

  if (stateError) {
    console.error("[google/callback] State lookup failed:", stateError.message);
    return dashboardRedirect(request, {
      google_error: "server_error",
      message: "Failed to validate OAuth state",
    });
  }

  if (!oauthState) {
    return dashboardRedirect(request, {
      google_error: "invalid_state",
      message: "Invalid or already-used OAuth state",
    });
  }

  if (new Date(oauthState.expires_at) < new Date()) {
    await supabase.from("google_oauth_states").delete().eq("id", oauthState.id);
    return dashboardRedirect(request, {
      google_error: "expired_state",
      message: "OAuth session expired — please try connecting again",
    });
  }

  const clientId = oauthState.client_id;

  let tokenData: GoogleTokenResponse;
  try {
    tokenData = await exchangeCodeForTokens(code);
  } catch (err) {
    console.error("[google/callback] Token exchange failed:", err);
    await supabase.from("google_oauth_states").delete().eq("id", oauthState.id);
    return dashboardRedirect(request, {
      google_error: "token_exchange_failed",
      message: "Failed to obtain access token from Google",
    });
  }

  if (!tokenData.refresh_token) {
    console.error("[google/callback] No refresh token received");
    await supabase.from("google_oauth_states").delete().eq("id", oauthState.id);
    return dashboardRedirect(request, {
      google_error: "no_refresh_token",
      message: "No refresh token received. Please revoke access at myaccount.google.com/permissions and try again.",
    });
  }

  let customerIds: string[];
  try {
    customerIds = await fetchAccessibleCustomers(tokenData.access_token);
  } catch (err) {
    console.error("[google/callback] Customer fetch failed:", err);
    await supabase.from("google_oauth_states").delete().eq("id", oauthState.id);
    return dashboardRedirect(request, {
      google_error: "fetch_customers_failed",
      message: "Connected to Google but failed to retrieve ad accounts",
    });
  }

  if (customerIds.length === 0) {
    await supabase.from("google_oauth_states").delete().eq("id", oauthState.id);
    return dashboardRedirect(request, {
      google_error: "no_accounts",
      message: "No Google Ads accounts found for this user",
    });
  }

  // Use the first accessible customer
  let customerInfo: { id: string; name: string; managerCustomerId?: string };
  try {
    customerInfo = await fetchCustomerInfo(tokenData.access_token, customerIds[0]);
  } catch {
    customerInfo = { id: customerIds[0], name: `Account ${customerIds[0]}` };
  }

  const adminClient = createAdminClient();
  const tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
  const encryptedAccessToken = encryptGoogleToken(tokenData.access_token);
  const encryptedRefreshToken = encryptGoogleToken(tokenData.refresh_token);

  const { data: adAccountRow, error: upsertError } = await adminClient
    .from("google_ad_accounts")
    .upsert(
      {
        user_id: user.id,
        client_id: clientId,
        google_customer_id: customerInfo.id,
        google_account_name: customerInfo.name,
        google_manager_id: customerInfo.managerCustomerId ?? null,
        is_active: true,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id,client_id" },
    )
    .select("id")
    .single();

  if (upsertError || !adAccountRow) {
    console.error("[google/callback] Ad account upsert failed:", upsertError?.message);
    await supabase.from("google_oauth_states").delete().eq("id", oauthState.id);
    return dashboardRedirect(request, {
      google_error: "save_failed",
      message: "Failed to save ad account connection",
    });
  }

  const { error: tokenError } = await adminClient.from("google_tokens").upsert(
    {
      google_ad_account_id: adAccountRow.id,
      access_token_enc: encryptedAccessToken,
      refresh_token_enc: encryptedRefreshToken,
      token_expires_at: tokenExpiresAt,
      scopes: tokenData.scope,
      last_refreshed_at: new Date().toISOString(),
      refresh_error: null,
    },
    { onConflict: "google_ad_account_id" },
  );

  if (tokenError) {
    console.error("[google/callback] Token upsert failed:", tokenError.message);
    await supabase.from("google_oauth_states").delete().eq("id", oauthState.id);
    return dashboardRedirect(request, {
      google_error: "save_failed",
      message: "Failed to store access token",
    });
  }

  await supabase.from("google_oauth_states").delete().eq("id", oauthState.id);

  return dashboardRedirect(request, {
    google_connected: "true",
    client_id: clientId,
    google_account_name: customerInfo.name ?? customerInfo.id,
  });
}
