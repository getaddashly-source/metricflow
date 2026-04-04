import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-14 sm:py-16">
      <section className="relative overflow-hidden rounded-3xl border bg-linear-to-br from-white via-slate-50 to-sky-50 p-8 sm:p-10">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute -bottom-24 left-8 h-64 w-64 rounded-full bg-blue-100/50 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
            Addashly Analytics Platform
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Addashly
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
            Addashly is a reporting and analytics application for teams that
            run paid campaigns and online stores. We connect authorized Google
            Ads, Meta Ads, and Shopify accounts to present unified performance
            dashboards, campaign trends, and ecommerce outcomes in one place.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Sign in
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-md border bg-white/80 px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Open Dashboard
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-md border bg-white/80 px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Contact Team
            </Link>
            <Link
              href="/google-ads-api"
              className="inline-flex items-center justify-center rounded-md border bg-white/80 px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Google Ads API Use Case
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border bg-card p-5">
          <p className="text-2xl font-bold">Read-only Insights</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Addashly uses the Google Ads API to read performance metrics and
            dimensions for reporting.
          </p>
        </article>
        <article className="rounded-xl border bg-card p-5">
          <p className="text-2xl font-bold">Authorized Access</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Every connection is initiated by an authenticated user through OAuth
            consent and can be disconnected at any time.
          </p>
        </article>
        <article className="rounded-xl border bg-card p-5">
          <p className="text-2xl font-bold">Cross-channel View</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Combine ad spend, clicks, impressions, conversions, and order data
            from ad and commerce platforms.
          </p>
        </article>
      </section>

      <section className="mt-12 rounded-2xl border p-6 sm:p-8">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
            Product Preview
          </p>
          <h2 className="text-2xl font-semibold">Real Addashly dashboard views</h2>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            The screenshots below show sample analytics views generated from
            connected ad and commerce data. They illustrate how authorized data
            from integrations like Google Ads is used for reporting.
          </p>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <article className="overflow-hidden rounded-xl border bg-card">
            <Image
              src="/dailyPerformance.png"
              alt="Addashly daily marketing performance dashboard with spend and conversion trends"
              width={1280}
              height={768}
              className="h-auto w-full"
              priority
            />
            <div className="border-t p-4">
              <h3 className="font-semibold">Daily Performance Dashboard</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Cross-channel KPIs for spend, impressions, clicks, and
                conversions with date-based trend analysis.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Sample dashboard data shown for product demonstration.
              </p>
            </div>
          </article>

          <article className="overflow-hidden rounded-xl border bg-card">
            <Image
              src="/revenueVsSpend.png"
              alt="Addashly revenue versus ad spend view comparing campaign investment to business outcomes"
              width={1280}
              height={768}
              className="h-auto w-full"
            />
            <div className="border-t p-4">
              <h3 className="font-semibold">Revenue vs Spend Analysis</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Compare advertising investment against tracked revenue outcomes
                to evaluate channel efficiency and profitability.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Sample dashboard data shown for product demonstration.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border p-6">
          <h2 className="text-xl font-semibold">Google Ads API Use Case</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Addashly helps businesses monitor and compare advertising
            performance. After user authorization, our system synchronizes
            reporting data from Google Ads accounts into our analytics database.
            We use this data to generate dashboards, campaign tables, and date
            range trends visible only to authorized workspace users.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>Reads account, campaign, ad group, and performance metrics.</li>
            <li>Supports periodic sync to keep reports up to date.</li>
            <li>Does not create, modify, or manage live ad campaigns.</li>
            <li>Uses data only for customer-facing analytics and reporting.</li>
          </ul>
          <Link
            href="/google-ads-api"
            className="mt-5 inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            View full Google Ads API details
          </Link>
        </article>

        <article className="rounded-2xl border p-6">
          <h2 className="text-xl font-semibold">Data Handling and Security</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Addashly stores connected account data securely and limits access
            to authenticated users. OAuth credentials are encrypted at rest,
            access can be revoked by users, and we process data solely for the
            reporting functionality described on this site.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>OAuth-based authorization for each integration connection.</li>
            <li>Encrypted token storage and protected backend endpoints.</li>
            <li>User-controlled disconnect and account removal flows.</li>
            <li>Published privacy policy and terms for platform usage.</li>
          </ul>
        </article>
      </section>

      <section className="mt-12 rounded-2xl border bg-slate-50/70 p-6">
        <h2 className="text-xl font-semibold">Who This Is For</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Addashly is designed for marketing teams, ecommerce operators,
          agencies, and founders who need a unified view of campaign performance
          and sales outcomes across platforms.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-white p-4">
            <p className="font-medium">Marketing Teams</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Compare campaign impact across multiple channels.
            </p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="font-medium">Performance Agencies</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Consolidate client reporting workflows.
            </p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="font-medium">Ecommerce Brands</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Relate ad spend to revenue and orders.
            </p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="font-medium">Operators</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Track performance trends with less manual work.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/about" className="rounded-lg border bg-card p-4 hover:bg-accent">
          <h2 className="font-semibold">About</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Company overview, mission, and product scope.
          </p>
        </Link>
        <Link href="/privacy" className="rounded-lg border bg-card p-4 hover:bg-accent">
          <h2 className="font-semibold">Privacy Policy</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            How analytics data is collected, processed, and retained.
          </p>
        </Link>
        <Link href="/terms" className="rounded-lg border bg-card p-4 hover:bg-accent">
          <h2 className="font-semibold">Terms of Service</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Platform terms, responsibilities, and usage conditions.
          </p>
        </Link>
        <Link href="/contact" className="rounded-lg border bg-card p-4 hover:bg-accent">
          <h2 className="font-semibold">Contact</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Reach our team for support and compliance requests.
          </p>
        </Link>
      </section>

      <section className="mt-12 rounded-2xl border p-6">
        <h2 className="text-xl font-semibold">Business and Compliance Contact</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          For Google Ads API review, compliance, or security inquiries, please
          contact the Addashly team at <a className="underline" href="mailto:Hello@addashly.com">Hello@addashly.com</a> or
          through the Contact page. Include your organization details and
          request type for faster verification and response.
        </p>
      </section>
    </main>
  );
}


