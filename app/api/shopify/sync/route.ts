import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncOrdersForStore } from "@/lib/shopify/insights";

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

  const { data: stores, error: storesError } = await adminClient
    .from("shopify_stores")
    .select(`
      id,
      shop_domain,
      shop_name,
      shopify_tokens (
        access_token_enc
      )
    `)
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (storesError) {
    console.error("[shopify/sync] Failed to fetch stores:", storesError.message);
    return NextResponse.json({ error: "Failed to fetch connected stores" }, { status: 500 });
  }

  if (!stores || stores.length === 0) {
    return NextResponse.json({ error: "No connected Shopify stores found" }, { status: 404 });
  }

  const results = [];

  for (const store of stores) {
    const token = Array.isArray(store.shopify_tokens)
      ? store.shopify_tokens[0]
      : store.shopify_tokens;

    if (!token?.access_token_enc) {
      results.push({
        store: store.shop_name ?? store.shop_domain,
        error: "No token found",
        synced: 0,
      });
      continue;
    }

    const result = await syncOrdersForStore(
      store.id,
      store.shop_domain,
      token.access_token_enc,
      dateFrom,
      dateTo,
    );

    results.push({
      store: store.shop_name ?? store.shop_domain,
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
