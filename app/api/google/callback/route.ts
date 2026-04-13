import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptGoogleToken } from "@/lib/google/encryption";
import { persistGoogleConnection } from "@/lib/google/connection";

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

function googleDeveloperToken(): string {
  return env("GOOGLE_ADS_DEVELOPER_TOKEN").trim();
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
  async function requestAccessibleCustomers(useQueryToken: boolean) {
    const url = new URL(`${googleAdsApiBase()}/customers:listAccessibleCustomers`);
    if (useQueryToken) {
      // Fallback for environments where Authorization header is stripped on redirect.
      url.searchParams.set("access_token", accessToken);
    }

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        ...(useQueryToken
          ? {}
          : { Authorization: `Bearer ${accessToken}` }),
        "developer-token": googleDeveloperToken(),
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const body = await parseJsonResponse(res, "Google accessible customers endpoint");
    return { res, body };
  }

  let { res, body } = await requestAccessibleCustomers(false);

  if (!res.ok) {
    const error = body.error as { message?: string; status?: string } | undefined;
    const message = error?.message ?? "";
    const unauthenticated =
      /missing required authentication credential/i.test(message) ||
      error?.status === "UNAUTHENTICATED";

    if (unauthenticated) {
      ({ res, body } = await requestAccessibleCustomers(true));
    }
  }

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
      "developer-token": googleDeveloperToken(),
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

  const adminClient = createAdminClient();
  const customerInfos = await Promise.all(
    customerIds.map(async (customerId) => {
      try {
        return await fetchCustomerInfo(tokenData.access_token, customerId);
      } catch {
        return { id: customerId, name: `Account ${customerId}` };
      }
    }),
  );

  if (customerInfos.length > 1) {
    const selectionToken = randomBytes(32).toString("hex");
    const selectionExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: selectionError } = await adminClient
      .from("google_oauth_account_selections")
      .insert({
        user_id: user.id,
        client_id: clientId,
        selection_token: selectionToken,
        access_token_enc: encryptGoogleToken(tokenData.access_token),
        refresh_token_enc: encryptGoogleToken(tokenData.refresh_token),
        token_expires_at: new Date(
          Date.now() + tokenData.expires_in * 1000,
        ).toISOString(),
        scopes: tokenData.scope,
        customer_options: customerInfos,
        expires_at: selectionExpiry,
      });

    await supabase.from("google_oauth_states").delete().eq("id", oauthState.id);

    if (!selectionError) {
      const selectUrl = request.nextUrl.clone();
      selectUrl.pathname = "/dashboard/channels/google-ads/select-account";
      selectUrl.search = "";
      selectUrl.searchParams.set("token", selectionToken);
      return NextResponse.redirect(selectUrl);
    }

    const missingSelectionTable =
      /google_oauth_account_selections|schema cache/i.test(selectionError.message);

    if (!missingSelectionTable) {
      console.error("[google/callback] Failed to create account selection:", selectionError.message);
      return dashboardRedirect(request, {
        google_error: "save_failed",
        message: "Failed to prepare account selection",
      });
    }

    // Backward-compatible fallback when migration has not been applied yet.
    console.warn(
      "[google/callback] Selection table missing; auto-selecting first accessible account",
    );
  }

  const selected = customerInfos[0];

  const result = await persistGoogleConnection({
    userId: user.id,
    clientId,
    account: {
      id: selected.id,
      name: selected.name,
      managerCustomerId: selected.managerCustomerId,
    },
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresIn: tokenData.expires_in,
    scopes: tokenData.scope,
  });

  if (!result.ok) {
    console.error("[google/callback] Persist connection failed:", result.error);
    await supabase.from("google_oauth_states").delete().eq("id", oauthState.id);
    return dashboardRedirect(request, {
      google_error: "save_failed",
      message: "Failed to save ad account connection",
    });
  }

  await supabase.from("google_oauth_states").delete().eq("id", oauthState.id);

  return dashboardRedirect(request, {
    google_connected: "true",
    client_id: clientId,
    google_account_name: result.accountName,
  });
}
