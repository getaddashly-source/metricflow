export const metadata = {
  title: "Terms of Service | MetricFlow",
  description: "MetricFlow Terms of Service",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: March 14, 2026</p>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Use of service</h2>
        <p className="text-muted-foreground">
          MetricFlow provides analytics and reporting tools for authorized
          account owners and permitted users. You agree to use the service in
          accordance with applicable laws and platform policies.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Account responsibilities</h2>
        <p className="text-muted-foreground">
          You are responsible for the credentials and authorizations used to
          connect external platforms and for activities performed under your
          account.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Third-party platforms</h2>
        <p className="text-muted-foreground">
          Integrations with third-party platforms are subject to those
          platforms&apos; terms and policies. Availability of integrations may
          change based on third-party service terms.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Limitation of liability</h2>
        <p className="text-muted-foreground">
          To the extent permitted by law, MetricFlow is provided on an
          &quot;as-is&quot; basis without warranties, and liability is limited for
          indirect or consequential damages.
        </p>
      </section>
    </main>
  );
}