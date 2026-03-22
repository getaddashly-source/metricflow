import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Addashly",
  description: "Addashly Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Addashly Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: March 21, 2026</p>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Information we collect</h2>
        <p className="text-muted-foreground">
          When you connect your accounts, Addashly may process profile and
          account identifiers, and analytics/reporting data such as impressions,
          clicks, spend, conversions, revenue, and related metrics.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">How we use data</h2>
        <p className="text-muted-foreground">
          Data is used to provide dashboards, generate reporting insights, and
          support analytics workflows for authorized users.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Meta (Facebook) platform data</h2>
        <p className="text-muted-foreground">
          If you connect Meta Ads, Addashly accesses only the permissions you
          grant through Meta OAuth. For analytics-only workflows, we use
          Meta-provided ad account and performance data (for example: campaign,
          ad set, ad metrics such as spend, impressions, clicks, and related
          insight fields) to display reporting dashboards.
        </p>
        <p className="text-muted-foreground">
          We do not sell Meta platform data and we do not use Meta data for
          unrelated purposes. Users can disconnect Meta integrations at any
          time and request deletion of stored integration data.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Data sharing</h2>
        <p className="text-muted-foreground">
          We do not sell personal data. We only process and store data required
          to provide the service and may share data with infrastructure/service
          providers under contractual safeguards.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Data retention and deletion</h2>
        <p className="text-muted-foreground">
          We retain data for as long as needed to provide the service or comply
          with legal obligations. You may request deletion of connected data via
          our <Link href="/data-deletion" className="underline">Data Deletion</Link> page.
        </p>
        <p className="text-muted-foreground">
          Meta platform users may also initiate deletion through Meta&apos;s data
          deletion flow, which calls our callback endpoint at
          <span className="font-medium"> /api/meta/data-deletion</span>.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Contact</h2>
        <p className="text-muted-foreground">
          For privacy requests, contact us at <a className="underline" href="mailto:Hello@addashly.com">Hello@addashly.com</a>.
        </p>
      </section>
    </main>
  );
}

