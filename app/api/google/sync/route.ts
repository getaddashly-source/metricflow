import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncInsightsForAccount } from "@/lib/google/insights";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dateFrom = body.date_from ?? thirtyDaysAgo.toISOString().split("T")[0];
  const dateTo = body.date_to ?? now.toISOString().split("T")[0];

  const adminClient = createAdminClient();

  const { data: accounts, error: accountsError } = await adminClient
    .from("google_ad_accounts")
    .select(`
      id,
      google_customer_id,
      google_account_name,
      google_tokens (
        access_token_enc,
        refresh_token_enc,
        token_expires_at
      )
    `)
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (accountsError) {
    console.error("[google/sync] Failed to fetch accounts:", accountsError.message);
    return NextResponse.json({ error: "Failed to fetch connected accounts" }, { status: 500 });
  }

  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ error: "No connected Google ad accounts found" }, { status: 404 });
  }

  const results = [];

  for (const account of accounts) {
    const token = Array.isArray(account.google_tokens)
      ? account.google_tokens[0]
      : account.google_tokens;

    if (!token?.access_token_enc || !token?.refresh_token_enc) {
      results.push({
        account: account.google_account_name ?? account.google_customer_id,
        error: "No token found",
        synced: 0,
      });
      continue;
    }

    const result = await syncInsightsForAccount(
      account.id,
      account.google_customer_id,
      token.access_token_enc,
      token.refresh_token_enc,
      token.token_expires_at,
      dateFrom,
      dateTo,
    );

    results.push({
      account: account.google_account_name ?? account.google_customer_id,
      synced: result.synced,
      error: result.error ?? null,
    });
  }

  return NextResponse.json({
    success: true,
    date_from: dateFrom,
    date_to: dateTo,
    results,
  });
}
