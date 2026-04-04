export const metadata = {
  title: "Terms of Service | Addashly",
  description: "Addashly Terms of Service",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Addashly Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: April 5, 2026</p>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Use of service</h2>
        <p className="text-muted-foreground">
          Addashly provides analytics and reporting tools for authorized
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
        <p className="text-muted-foreground">
          For Google Ads integrations, users authorize Addashly to access
          reporting data required for dashboard analytics. Addashly does not use
          Google Ads API access to manage live campaigns on behalf of users.
        </p>
        <p className="text-muted-foreground">
          For Meta (Facebook) integrations, you agree to use Addashly in
          compliance with the Meta Platform Terms, Meta Developer Policies, and
          applicable advertising platform requirements.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Permissions and data access</h2>
        <p className="text-muted-foreground">
          Addashly requests only the permissions needed for enabled
          functionality. For read-only analytics use cases, Addashly uses
          permission scopes to access reporting data and does not modify active
          campaigns unless explicitly documented and authorized.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Limitation of liability</h2>
        <p className="text-muted-foreground">
          To the extent permitted by law, Addashly is provided on an
          &quot;as-is&quot; basis without warranties, and liability is limited for
          indirect or consequential damages.
        </p>
      </section>
    </main>
  );
}

