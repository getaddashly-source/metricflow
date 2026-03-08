import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

const GOOGLE_OAUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";

const REQUIRED_SCOPES = [
  "https://www.googleapis.com/auth/adwords",
] as const;

const STATE_TTL_MS = 10 * 60 * 1000;

function env(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const clientId = searchParams.get("client_id");

  if (!clientId || clientId.trim().length === 0) {
    return jsonError("Missing required query parameter: client_id", 400);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return jsonError("Unauthorized — valid session required", 401);
  }

  const { data: existingAccount, error: lookupError } = await supabase
    .from("google_ad_accounts")
    .select("id, is_active")
    .eq("user_id", user.id)
    .eq("client_id", clientId.trim())
    .maybeSingle();

  if (lookupError) {
    console.error("[google/connect] Client lookup failed:", lookupError.message);
    return jsonError("Failed to validate client ownership", 500);
  }

  if (existingAccount?.is_active) {
    return jsonError(
      "This client already has an active Google Ad Account connection. Disconnect first before reconnecting.",
      409,
    );
  }

  const state = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + STATE_TTL_MS).toISOString();

  const { error: stateError } = await supabase
    .from("google_oauth_states")
    .insert({
      user_id: user.id,
      client_id: clientId.trim(),
      state,
      expires_at: expiresAt,
    });

  if (stateError) {
    console.error("[google/connect] State insert failed:", stateError.message);
    return jsonError("Failed to initiate OAuth flow", 500);
  }

  const googleClientId = env("GOOGLE_CLIENT_ID");
  const redirectUri = env("GOOGLE_REDIRECT_URI");

  const oauthUrl = new URL(GOOGLE_OAUTH_BASE);
  oauthUrl.searchParams.set("client_id", googleClientId);
  oauthUrl.searchParams.set("redirect_uri", redirectUri);
  oauthUrl.searchParams.set("state", state);
  oauthUrl.searchParams.set("scope", REQUIRED_SCOPES.join(" "));
  oauthUrl.searchParams.set("response_type", "code");
  oauthUrl.searchParams.set("access_type", "offline");
  oauthUrl.searchParams.set("prompt", "consent");

  return NextResponse.redirect(oauthUrl.toString());
}
