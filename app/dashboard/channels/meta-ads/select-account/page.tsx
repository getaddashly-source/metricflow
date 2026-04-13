import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type MetaOption = {
  id: string;
  name: string;
  businessId?: string | null;
};

export default async function MetaSelectAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token;

  if (!token) {
    redirect("/dashboard/channels/meta-ads?meta_error=invalid_selection&message=Missing+selection+token");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: selection } = await supabase
    .from("meta_oauth_account_selections")
    .select("selection_token, account_options, expires_at")
    .eq("selection_token", token)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!selection || new Date(selection.expires_at) < new Date()) {
    redirect("/dashboard/channels/meta-ads?meta_error=expired_selection&message=Selection+expired.+Please+connect+again");
  }

  const options = Array.isArray(selection.account_options)
    ? (selection.account_options as MetaOption[])
    : [];

  if (options.length === 0) {
    redirect("/dashboard/channels/meta-ads?meta_error=no_accounts&message=No+Meta+ad+accounts+available+to+select");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Select Meta Ad Account</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Choose the Meta ad account you want to connect for dashboard insights.
        </p>
      </div>

      <div className="grid gap-4">
        {options.map((option) => (
          <Card key={option.id}>
            <CardHeader>
              <CardTitle className="text-lg">{option.name || `Account ${option.id}`}</CardTitle>
              <CardDescription>Ad account ID: {option.id}</CardDescription>
            </CardHeader>
            <CardContent>
              {option.businessId ? (
                <p className="mb-3 text-sm text-zinc-500">Business ID: {option.businessId}</p>
              ) : null}
              <form action="/api/meta/select-account" method="post">
                <input type="hidden" name="token" value={selection.selection_token} />
                <input type="hidden" name="account_id" value={option.id} />
                <Button type="submit">Connect this account</Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
