import { createAdminClient } from "@/lib/supabase/admin";
import { encryptGoogleToken } from "@/lib/google/encryption";

export type GoogleSelectedAccount = {
  id: string;
  name: string;
  managerCustomerId?: string;
};

export async function persistGoogleConnection(params: {
  userId: string;
  clientId: string;
  account: GoogleSelectedAccount;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scopes: string;
}): Promise<{ ok: true; accountName: string } | { ok: false; error: string }> {
  const adminClient = createAdminClient();

  const tokenExpiresAt = new Date(Date.now() + params.expiresIn * 1000).toISOString();
  const encryptedAccessToken = encryptGoogleToken(params.accessToken);
  const encryptedRefreshToken = encryptGoogleToken(params.refreshToken);

  const { data: adAccountRow, error: upsertError } = await adminClient
    .from("google_ad_accounts")
    .upsert(
      {
        user_id: params.userId,
        client_id: params.clientId,
        google_customer_id: params.account.id,
        google_account_name: params.account.name,
        google_manager_id: params.account.managerCustomerId ?? null,
        is_active: true,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id,client_id" },
    )
    .select("id")
    .single();

  if (upsertError || !adAccountRow) {
    return {
      ok: false,
      error: upsertError?.message ?? "Failed to save ad account connection",
    };
  }

  const { error: tokenError } = await adminClient.from("google_tokens").upsert(
    {
      google_ad_account_id: adAccountRow.id,
      access_token_enc: encryptedAccessToken,
      refresh_token_enc: encryptedRefreshToken,
      token_expires_at: tokenExpiresAt,
      scopes: params.scopes,
      last_refreshed_at: new Date().toISOString(),
      refresh_error: null,
    },
    { onConflict: "google_ad_account_id" },
  );

  if (tokenError) {
    return {
      ok: false,
      error: tokenError.message,
    };
  }

  return { ok: true, accountName: params.account.name ?? params.account.id };
}
