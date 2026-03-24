import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import { AdsChannelView } from "../ads-channel-view";

const DEMO_CLIENT_ID = "demo-client";

type GoogleRow = {
  campaign_id: string;
  campaign_name: string | null;
  date_start: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversion_value: number;
};

export default async function GoogleAdsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: accounts } = await supabase
    .from("google_ad_accounts")
    .select("id, client_id, google_account_name")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1);

  const account = accounts?.[0];
  if (!account) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center">
        <p className="text-xl font-semibold text-zinc-900">No Google Ads account connected</p>
        <p className="mx-auto mt-2 max-w-lg text-sm text-zinc-600">
          Connect Google Ads to view campaign performance, sync insights, and manage spend.
        </p>
        <a href={`/api/google/connect?client_id=${DEMO_CLIENT_ID}`} className="mt-6 inline-block">
          <Button>Connect Google Ads</Button>
        </a>
      </div>
    );
  }

  const { data } = await supabase
    .from("google_campaign_insights")
    .select("campaign_id, campaign_name, date_start, impressions, clicks, spend, conversion_value")
    .eq("google_ad_account_id", account.id)
    .order("date_start", { ascending: true });

  const rows = (data ?? []) as GoogleRow[];

  return (
    <AdsChannelView
      title="Google Ads"
      subtitle="Channel performance breakdown"
      accountLabel={account.google_account_name ?? "Active account"}
      rows={rows}
      channelType="google"
      clientId={account.client_id ?? DEMO_CLIENT_ID}
      icon={<Globe className="h-6 w-6" />}
      iconClassName="grid h-12 w-12 place-items-center rounded-xl bg-zinc-800 text-white"
    />
  );
}
