import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptToken } from "@/lib/meta/encryption";
import { persistMetaConnection } from "@/lib/meta/connection";

// ─── Types ───────────────────────────────────────────────────

interface MetaTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // seconds
}

interface MetaLongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface MetaAdAccount {
  id: string; // "act_XXXXXXXXX"
  name: string;
  account_id: string; // numeric id without "act_" prefix
  account_status: number;
  business?: {
    id: string;
    name: string;
  };
}

interface MetaAdAccountsResponse {
  data: MetaAdAccount[];
  paging?: { cursors: { before: string; after: string }; next?: string };
}

interface MetaErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
}

interface MetaMeResponse {
  id: string;
}

// ─── Constants ───────────────────────────────────────────────

const META_GRAPH_BASE = "https://graph.facebook.com/v21.0";
const DASHBOARD_PATH = "/dashboard";

// ─── Helpers ─────────────────────────────────────────────────

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

// ─── Meta API helpers ────────────────────────────────────────

/**
 * Exchange the short-lived authorization code for a short-lived access token.
 */
async function exchangeCodeForToken(
  code: string,
): Promise<MetaTokenResponse> {
  const url = new URL(`${META_GRAPH_BASE}/oauth/access_token`);
  url.searchParams.set("client_id", env("META_APP_ID"));
  url.searchParams.set("client_secret", env("META_APP_SECRET"));
  url.searchParams.set("redirect_uri", env("META_REDIRECT_URI"));
  url.searchParams.set("code", code);

  const res = await fetch(url.toString(), { method: "GET" });
  const body = await res.json();

  if (!res.ok || !body.access_token) {
    const error = body as MetaErrorResponse;
    throw new Error(
      `Meta token exchange failed: ${error.error?.message ?? res.statusText}`,
    );
  }

  return body as MetaTokenResponse;
}

/**
 * Exchange a short-lived token for a long-lived token (~60 days).
 */
async function exchangeForLongLivedToken(
  shortLivedToken: string,
): Promise<MetaLongLivedTokenResponse> {
  const url = new URL(`${META_GRAPH_BASE}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", env("META_APP_ID"));
  url.searchParams.set("client_secret", env("META_APP_SECRET"));
  url.searchParams.set("fb_exchange_token", shortLivedToken);

  const res = await fetch(url.toString(), { method: "GET" });
  const body = await res.json();

  if (!res.ok || !body.access_token) {
    const error = body as MetaErrorResponse;
    throw new Error(
      `Meta long-lived token exchange failed: ${error.error?.message ?? res.statusText}`,
    );
  }

  return body as MetaLongLivedTokenResponse;
}

/**
 * Fetch the user's ad accounts from the Marketing API.
 */
async function fetchAdAccounts(
  accessToken: string,
): Promise<MetaAdAccount[]> {
  async function requestAdAccounts(fields: string): Promise<{
    res: Response;
    body: unknown;
  }> {
    const url = new URL(`${META_GRAPH_BASE}/me/adaccounts`);
    url.searchParams.set("fields", fields);
    url.searchParams.set("access_token", accessToken);
    url.searchParams.set("limit", "100");

    const res = await fetch(url.toString(), { method: "GET" });
    const body = await res.json();
    return { res, body };
  }

  let { res, body } = await requestAdAccounts(
    "id,name,account_id,account_status",
  );

  // Some apps are granted ads_read but not business_management.
  // Retry without the business field so OAuth can still complete.
  if (!res.ok || !(body as MetaAdAccountsResponse).data) {
    const error = body as MetaErrorResponse;
    const message = error.error?.message ?? "";
    if (error.error?.code === 100 && /business_management/i.test(message)) {
      ({ res, body } = await requestAdAccounts(
        "id,name,account_id,account_status",
      ));
    }
  }

  if (!res.ok || !(body as MetaAdAccountsResponse).data) {
    const error = body as MetaErrorResponse;
    throw new Error(
      `Failed to fetch ad accounts: ${error.error?.message ?? res.statusText}`,
    );
  }

  return (body as MetaAdAccountsResponse).data;
}

async function fetchMetaUserId(accessToken: string): Promise<string> {
  const url = new URL(`${META_GRAPH_BASE}/me`);
  url.searchParams.set("fields", "id");
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString(), { method: "GET" });
  const body = await res.json();

  if (!res.ok || !body.id) {
    const error = body as MetaErrorResponse;
    throw new Error(
      `Failed to fetch Meta user id: ${error.error?.message ?? res.statusText}`,
    );
  }

  return (body as MetaMeResponse).id;
}

// ─── GET /api/meta/callback ─────────────────────────────────
//
// Meta redirects here with ?code=...&state=...
//
// Flow:
//   1. Validate code + state params
//   2. Authenticate user session
//   3. Look up & validate state from DB (CSRF check + expiry)
//   4. Exchange code → short-lived token → long-lived token
//   5. Fetch ad accounts from /me/adaccounts
//   6. Store first ad account + encrypted token
//   7. Delete used state entry
//   8. Redirect to dashboard
// ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  // ── 1. Validate query params ───────────────────────────────
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  // User denied permissions or Meta returned an error
  if (errorParam) {
    const errorDesc =
      searchParams.get("error_description") ?? "Unknown error from Meta";
    console.error("[meta/callback] OAuth denied:", errorParam, errorDesc);
    return dashboardRedirect(request, {
      meta_error: "access_denied",
      message: errorDesc,
    });
  }

  if (!code || !state) {
    return dashboardRedirect(request, {
      meta_error: "invalid_request",
      message: "Missing code or state parameter",
    });
  }

  // ── 2. Authenticate user ──────────────────────────────────
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return dashboardRedirect(request, {
      meta_error: "unauthorized",
      message: "Session expired — please log in and try again",
    });
  }

  // ── 3. Validate state (CSRF + expiry) ─────────────────────
  const { data: oauthState, error: stateError } = await supabase
    .from("meta_oauth_states")
    .select("id, user_id, client_id, expires_at")
    .eq("state", state)
    .eq("user_id", user.id)
    .maybeSingle();

  if (stateError) {
    console.error("[meta/callback] State lookup failed:", stateError.message);
    return dashboardRedirect(request, {
      meta_error: "server_error",
      message: "Failed to validate OAuth state",
    });
  }

  if (!oauthState) {
    return dashboardRedirect(request, {
      meta_error: "invalid_state",
      message: "Invalid or already-used OAuth state",
    });
  }

  // Check expiry
  if (new Date(oauthState.expires_at) < new Date()) {
    // Clean up expired state
    await supabase.from("meta_oauth_states").delete().eq("id", oauthState.id);
    return dashboardRedirect(request, {
      meta_error: "expired_state",
      message: "OAuth session expired — please try connecting again",
    });
  }

  const clientId = oauthState.client_id;

  // ── 4. Exchange code → tokens ─────────────────────────────
  let longLivedToken: MetaLongLivedTokenResponse;

  try {
    // Step A: code → short-lived token
    const shortLived = await exchangeCodeForToken(code);

    // Step B: short-lived → long-lived token (~60 days)
    longLivedToken = await exchangeForLongLivedToken(shortLived.access_token);
  } catch (err) {
    console.error("[meta/callback] Token exchange failed:", err);
    // Clean up state since the flow failed
    await supabase.from("meta_oauth_states").delete().eq("id", oauthState.id);
    return dashboardRedirect(request, {
      meta_error: "token_exchange_failed",
      message: "Failed to obtain access token from Meta",
    });
  }

  // ── 5. Fetch ad accounts ──────────────────────────────────
  let adAccounts: MetaAdAccount[];
  let metaUserId: string | null = null;

  try {
    adAccounts = await fetchAdAccounts(longLivedToken.access_token);
  } catch (err) {
    console.error("[meta/callback] Ad account fetch failed:", err);
    await supabase.from("meta_oauth_states").delete().eq("id", oauthState.id);
    return dashboardRedirect(request, {
      meta_error: "fetch_accounts_failed",
      message: "Connected to Meta but failed to retrieve ad accounts",
    });
  }

  // Best-effort fetch for systems that have meta_user_id column available.
  // This should never block a successful connection.
  try {
    metaUserId = await fetchMetaUserId(longLivedToken.access_token);
  } catch {
    metaUserId = null;
  }

  if (adAccounts.length === 0) {
    await supabase.from("meta_oauth_states").delete().eq("id", oauthState.id);
    return dashboardRedirect(request, {
      meta_error: "no_accounts",
      message: "No ad accounts found for this Meta user",
    });
  }

  // Prefer active accounts first for selection and fallback.
  const orderedAccounts = [...adAccounts].sort((a, b) => {
    if (a.account_status === 1 && b.account_status !== 1) return -1;
    if (a.account_status !== 1 && b.account_status === 1) return 1;
    return 0;
  });

  // ── 6. Store ad account + encrypted token ─────────────────
  // Use admin client (service_role) for all DB writes.
  const adminClient = createAdminClient();

  if (orderedAccounts.length > 1) {
    const selectionToken = randomBytes(32).toString("hex");
    const selectionExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: selectionError } = await adminClient
      .from("meta_oauth_account_selections")
      .insert({
        user_id: user.id,
        client_id: clientId,
        selection_token: selectionToken,
        access_token_enc: encryptToken(longLivedToken.access_token),
        token_expires_at: new Date(
          Date.now() + longLivedToken.expires_in * 1000,
        ).toISOString(),
        scopes: "ads_read",
        meta_user_id: metaUserId,
        account_options: orderedAccounts.map((account) => ({
          id: account.id,
          name: account.name,
          businessId: account.business?.id ?? null,
        })),
        expires_at: selectionExpiry,
      });

    await supabase.from("meta_oauth_states").delete().eq("id", oauthState.id);

    if (!selectionError) {
      const selectUrl = request.nextUrl.clone();
      selectUrl.pathname = "/dashboard/channels/meta-ads/select-account";
      selectUrl.search = "";
      selectUrl.searchParams.set("token", selectionToken);
      return NextResponse.redirect(selectUrl);
    }

    const missingSelectionTable =
      /meta_oauth_account_selections|schema cache/i.test(selectionError.message);

    if (!missingSelectionTable) {
      console.error(
        "[meta/callback] Failed to create account selection:",
        selectionError.message,
      );
      return dashboardRedirect(request, {
        meta_error: "save_failed",
        message: "Failed to prepare account selection",
      });
    }

    console.warn(
      "[meta/callback] Selection table missing; auto-selecting first accessible account",
    );
  }

  const selected = orderedAccounts[0];

  const result = await persistMetaConnection({
    userId: user.id,
    clientId,
    account: {
      id: selected.id,
      name: selected.name,
      businessId: selected.business?.id ?? null,
    },
    accessToken: longLivedToken.access_token,
    expiresIn: longLivedToken.expires_in,
    scopes: "ads_read",
    metaUserId,
  });

  if (!result.ok) {
    console.error("[meta/callback] Persist connection failed:", result.error);
    await supabase.from("meta_oauth_states").delete().eq("id", oauthState.id);
    return dashboardRedirect(request, {
      meta_error: "save_failed",
      message: "Failed to save ad account connection",
    });
  }

  // ── 7. Delete used state entry ────────────────────────────
  await supabase.from("meta_oauth_states").delete().eq("id", oauthState.id);

  // ── 8. Redirect to dashboard with success ─────────────────
  return dashboardRedirect(request, {
    meta_connected: "true",
    client_id: clientId,
    account_name: result.accountName,
  });
}
