import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const clientId = body.client_id;

  if (!clientId) {
    return NextResponse.json({ error: "Missing client_id" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  const { data: account } = await adminClient
    .from("google_ad_accounts")
    .select("id")
    .eq("user_id", user.id)
    .eq("client_id", clientId)
    .maybeSingle();

  if (account) {
    await adminClient.from("google_tokens").delete().eq("google_ad_account_id", account.id);
    await adminClient.from("google_ad_accounts").delete().eq("id", account.id);
  }

  return NextResponse.json({ success: true });
}
