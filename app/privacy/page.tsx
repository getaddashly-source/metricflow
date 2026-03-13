import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | MetricFlow",
  description: "MetricFlow Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: March 14, 2026</p>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Information we collect</h2>
        <p className="text-muted-foreground">
          When you connect your accounts, MetricFlow may process profile and
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
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Contact</h2>
        <p className="text-muted-foreground">
          For privacy requests, contact us at <a className="underline" href="mailto:getaddashly@gmail.com">getaddashly@gmail.com</a>.
        </p>
      </section>
    </main>
  );
}