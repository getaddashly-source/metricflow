import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Facebook } from "lucide-react";
import { AdsChannelView } from "../ads-channel-view";

const DEMO_CLIENT_ID = "demo-client";

type MetaRow = {
  campaign_id: string;
  campaign_name: string | null;
  date_start: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversion_value: number;
};

export default async function MetaAdsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: accounts } = await supabase
    .from("meta_ad_accounts")
    .select("id, client_id, meta_account_name")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1);

  const account = accounts?.[0];
  if (!account) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center">
        <p className="text-xl font-semibold text-zinc-900">No Meta Ads account connected</p>
        <p className="mx-auto mt-2 max-w-lg text-sm text-zinc-600">
          Connect Meta Ads to view campaign performance, sync insights, and manage spend.
        </p>
        <a href={`/api/meta/connect?client_id=${DEMO_CLIENT_ID}`} className="mt-6 inline-block">
          <Button>Connect Meta Ads</Button>
        </a>
      </div>
    );
  }

  const { data } = await supabase
    .from("meta_campaign_insights")
    .select("campaign_id, campaign_name, date_start, impressions, clicks, spend, conversion_value")
    .eq("meta_ad_account_id", account.id)
    .order("date_start", { ascending: true });

  const rows = (data ?? []) as MetaRow[];

  return (
    <AdsChannelView
      title="Meta Ads"
      subtitle="Channel performance breakdown"
      accountLabel={account.meta_account_name ?? "Active account"}
      rows={rows}
      channelType="meta"
      clientId={account.client_id ?? DEMO_CLIENT_ID}
      icon={<Facebook className="h-6 w-6" />}
      iconClassName="grid h-12 w-12 place-items-center rounded-xl bg-blue-600 text-white"
    />
  );
}
