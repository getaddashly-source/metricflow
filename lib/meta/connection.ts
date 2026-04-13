import { createAdminClient } from "@/lib/supabase/admin";
import { encryptToken } from "@/lib/meta/encryption";

export type MetaSelectedAccount = {
  id: string;
  name: string;
  businessId?: string | null;
};

export async function persistMetaConnection(params: {
  userId: string;
  clientId: string;
  account: MetaSelectedAccount;
  accessToken: string;
  expiresIn: number;
  scopes?: string;
  metaUserId?: string | null;
}): Promise<{ ok: true; accountName: string } | { ok: false; error: string }> {
  const adminClient = createAdminClient();
  const tokenExpiresAt = new Date(Date.now() + params.expiresIn * 1000).toISOString();
  const encryptedToken = encryptToken(params.accessToken);

  const accountPayload = {
    user_id: params.userId,
    client_id: params.clientId,
    meta_account_id: params.account.id,
    meta_account_name: params.account.name,
    meta_business_id: params.account.businessId ?? null,
    is_active: true,
    connected_at: new Date().toISOString(),
  };

  const { data: adAccountRow, error: upsertError } = await adminClient
    .from("meta_ad_accounts")
    .upsert(accountPayload, { onConflict: "user_id,client_id" })
    .select("id")
    .single();

  if (upsertError || !adAccountRow) {
    return {
      ok: false,
      error: upsertError?.message ?? "Failed to save ad account connection",
    };
  }

  if (params.metaUserId) {
    const { error: metaUserUpdateError } = await adminClient
      .from("meta_ad_accounts")
      .update({ meta_user_id: params.metaUserId })
      .eq("id", adAccountRow.id);

    if (
      metaUserUpdateError &&
      !metaUserUpdateError.message.includes("meta_user_id")
    ) {
      return {
        ok: false,
        error: metaUserUpdateError.message,
      };
    }
  }

  const { error: tokenError } = await adminClient.from("meta_tokens").upsert(
    {
      meta_ad_account_id: adAccountRow.id,
      access_token_enc: encryptedToken,
      token_expires_at: tokenExpiresAt,
      scopes: params.scopes ?? "ads_read",
      last_refreshed_at: new Date().toISOString(),
      refresh_error: null,
    },
    { onConflict: "meta_ad_account_id" },
  );

  if (tokenError) {
    return {
      ok: false,
      error: tokenError.message,
    };
  }

  return { ok: true, accountName: params.account.name ?? params.account.id };
}
