import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type GoogleOption = {
  id: string;
  name: string;
  managerCustomerId?: string;
};

export default async function GoogleSelectAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token;

  if (!token) {
    redirect("/dashboard/channels/google-ads?google_error=invalid_selection&message=Missing+selection+token");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: selection } = await supabase
    .from("google_oauth_account_selections")
    .select("selection_token, customer_options, expires_at")
    .eq("selection_token", token)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!selection || new Date(selection.expires_at) < new Date()) {
    redirect("/dashboard/channels/google-ads?google_error=expired_selection&message=Selection+expired.+Please+connect+again");
  }

  const options = Array.isArray(selection.customer_options)
    ? (selection.customer_options as GoogleOption[])
    : [];

  if (options.length === 0) {
    redirect("/dashboard/channels/google-ads?google_error=no_accounts&message=No+Google+Ads+accounts+available+to+select");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Select Google Ads Account</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Choose the account you want to connect for dashboard insights.
        </p>
      </div>

      <div className="grid gap-4">
        {options.map((option) => (
          <Card key={option.id}>
            <CardHeader>
              <CardTitle className="text-lg">{option.name || `Account ${option.id}`}</CardTitle>
              <CardDescription>Customer ID: {option.id}</CardDescription>
            </CardHeader>
            <CardContent>
              {option.managerCustomerId ? (
                <p className="mb-3 text-sm text-zinc-500">
                  Manager account: {option.managerCustomerId}
                </p>
              ) : null}
              <form action="/api/google/select-account" method="post">
                <input type="hidden" name="token" value={selection.selection_token} />
                <input type="hidden" name="customer_id" value={option.id} />
                <Button type="submit">Connect this account</Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
