import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/meta/encryption";
import { persistMetaConnection } from "@/lib/meta/connection";

type MetaOption = {
  id: string;
  name: string;
  businessId?: string | null;
};

function toMetaRedirect(request: NextRequest, params: Record<string, string>) {
  const url = request.nextUrl.clone();
  url.pathname = "/dashboard/channels/meta-ads";
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
    return toMetaRedirect(request, {
      meta_error: "unauthorized",
      message: "Please log in and try again",
    });
  }

  const formData = await request.formData();
  const token = String(formData.get("token") ?? "").trim();
  const accountId = String(formData.get("account_id") ?? "").trim();

  if (!token || !accountId) {
    return toMetaRedirect(request, {
      meta_error: "invalid_selection",
      message: "Missing selection data",
    });
  }

  const adminClient = createAdminClient();

  const { data: selection, error: selectionError } = await adminClient
    .from("meta_oauth_account_selections")
    .select("id, user_id, client_id, access_token_enc, token_expires_at, scopes, meta_user_id, account_options, expires_at")
    .eq("selection_token", token)
    .maybeSingle();

  if (selectionError || !selection || selection.user_id !== user.id) {
    return toMetaRedirect(request, {
      meta_error: "invalid_selection",
      message: "Invalid account selection. Please reconnect.",
    });
  }

  if (new Date(selection.expires_at) < new Date()) {
    await adminClient.from("meta_oauth_account_selections").delete().eq("id", selection.id);
    return toMetaRedirect(request, {
      meta_error: "expired_selection",
      message: "Selection expired. Please reconnect.",
    });
  }

  const options = Array.isArray(selection.account_options)
    ? (selection.account_options as MetaOption[])
    : [];
  const selected = options.find((option) => option.id === accountId);

  if (!selected) {
    return toMetaRedirect(request, {
      meta_error: "invalid_selection",
      message: "Selected account not available",
    });
  }

  const accessToken = decryptToken(selection.access_token_enc);
  const expiresIn = Math.max(
    60,
    Math.floor((new Date(selection.token_expires_at).getTime() - Date.now()) / 1000),
  );

  const result = await persistMetaConnection({
    userId: user.id,
    clientId: selection.client_id,
    account: {
      id: selected.id,
      name: selected.name,
      businessId: selected.businessId,
    },
    accessToken,
    expiresIn,
    scopes: selection.scopes ?? "ads_read",
    metaUserId: selection.meta_user_id,
  });

  await adminClient.from("meta_oauth_account_selections").delete().eq("id", selection.id);

  if (!result.ok) {
    return toMetaRedirect(request, {
      meta_error: "save_failed",
      message: "Failed to save selected Meta ad account",
    });
  }

  return toMetaRedirect(request, {
    meta_connected: "true",
    account_name: result.accountName,
  });
}
