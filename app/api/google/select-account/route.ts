import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptGoogleToken } from "@/lib/google/encryption";
import { persistGoogleConnection } from "@/lib/google/connection";

type GoogleOption = {
  id: string;
  name: string;
  managerCustomerId?: string;
};

function toDashboardRedirect(request: NextRequest, params: Record<string, string>) {
  const url = request.nextUrl.clone();
  url.pathname = "/dashboard/channels/google-ads";
  url.search = "";
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return toDashboardRedirect(request, {
      google_error: "unauthorized",
      message: "Please log in and try again",
    });
  }

  const formData = await request.formData();
  const token = String(formData.get("token") ?? "").trim();
  const customerId = String(formData.get("customer_id") ?? "").trim();

  if (!token || !customerId) {
    return toDashboardRedirect(request, {
      google_error: "invalid_selection",
      message: "Missing selection data",
    });
  }

  const adminClient = createAdminClient();

  const { data: selection, error: selectionError } = await adminClient
    .from("google_oauth_account_selections")
    .select("id, user_id, client_id, access_token_enc, refresh_token_enc, token_expires_at, scopes, customer_options, expires_at")
    .eq("selection_token", token)
    .maybeSingle();

  if (selectionError || !selection || selection.user_id !== user.id) {
    return toDashboardRedirect(request, {
      google_error: "invalid_selection",
      message: "Invalid account selection. Please reconnect.",
    });
  }

  if (new Date(selection.expires_at) < new Date()) {
    await adminClient.from("google_oauth_account_selections").delete().eq("id", selection.id);
    return toDashboardRedirect(request, {
      google_error: "expired_selection",
      message: "Selection expired. Please reconnect.",
    });
  }

  const options = Array.isArray(selection.customer_options)
    ? (selection.customer_options as GoogleOption[])
    : [];
  const selected = options.find((option) => option.id === customerId);

  if (!selected) {
    return toDashboardRedirect(request, {
      google_error: "invalid_selection",
      message: "Selected account not available",
    });
  }

  const accessToken = decryptGoogleToken(selection.access_token_enc);
  const refreshToken = decryptGoogleToken(selection.refresh_token_enc);
  const expiresIn = Math.max(
    60,
    Math.floor((new Date(selection.token_expires_at).getTime() - Date.now()) / 1000),
  );

  const result = await persistGoogleConnection({
    userId: user.id,
    clientId: selection.client_id,
    account: {
      id: selected.id,
      name: selected.name,
      managerCustomerId: selected.managerCustomerId,
    },
    accessToken,
    refreshToken,
    expiresIn,
    scopes: selection.scopes ?? "",
  });

  await adminClient.from("google_oauth_account_selections").delete().eq("id", selection.id);

  if (!result.ok) {
    return toDashboardRedirect(request, {
      google_error: "save_failed",
      message: "Failed to save selected Google account",
    });
  }

  return toDashboardRedirect(request, {
    google_connected: "true",
    google_account_name: result.accountName,
  });
}
