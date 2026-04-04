import Link from "next/link";

export const metadata = {
  title: "Google Ads API Use Case | Addashly",
  description: "How Addashly uses Google Ads API data for read-only analytics and reporting.",
};

export default function GoogleAdsApiPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Google Ads API Use Case</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: April 5, 2026</p>

      <p className="mt-5 text-base leading-7 text-muted-foreground">
        Addashly is a reporting and analytics platform for agencies and in-house teams.
        We use Google Ads API data to power read-only dashboards that help users evaluate
        campaign performance across channels.
      </p>

      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">What Addashly does with Google Ads API</h2>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
          <li>Reads campaign performance metrics for customer-authorized accounts.</li>
          <li>Builds dashboards for spend, clicks, impressions, conversions, and conversion value.</li>
          <li>Creates date-range trend analysis and campaign comparison reports.</li>
          <li>Keeps reporting data current through periodic sync jobs.</li>
        </ul>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">What Addashly does not do</h2>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
          <li>Does not create, edit, pause, or remove campaigns in Google Ads.</li>
          <li>Does not place bids or change budgets through the API.</li>
          <li>Does not resell Google Ads API data.</li>
        </ul>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">Authorization and user control</h2>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
          <li>Access is initiated only by authenticated users through OAuth consent.</li>
          <li>Each workspace can disconnect Google Ads access at any time.</li>
          <li>Only connected customer accounts are synchronized for reporting.</li>
        </ul>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">Data handling</h2>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
          <li>OAuth tokens are stored in encrypted form.</li>
          <li>Stored data is used solely for analytics features requested by the user.</li>
          <li>Users may request deletion of stored integration data.</li>
        </ul>
      </section>

      <section className="mt-10 rounded-2xl border bg-zinc-50 p-6">
        <h2 className="text-xl font-semibold">Related policy pages</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link href="/privacy" className="rounded-lg border bg-white p-3 text-sm hover:bg-accent">
            Privacy Policy
          </Link>
          <Link href="/terms" className="rounded-lg border bg-white p-3 text-sm hover:bg-accent">
            Terms of Service
          </Link>
          <Link href="/data-deletion" className="rounded-lg border bg-white p-3 text-sm hover:bg-accent">
            Data Deletion
          </Link>
          <Link href="/contact" className="rounded-lg border bg-white p-3 text-sm hover:bg-accent">
            Contact
          </Link>
        </div>
      </section>
    </main>
  );
}
