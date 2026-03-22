import Link from "next/link";

export const metadata = {
  title: "About | Addashly",
  description: "About the Addashly analytics platform",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">About Addashly Analytics</h1>
      <p className="mt-4 text-muted-foreground">
        Addashly is a marketing analytics platform that helps authorized users
        view performance data across ad and commerce channels in one dashboard.
      </p>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">What we do</h2>
        <p className="text-muted-foreground">
          We connect to platforms like Google Ads, Meta, and Shopify to display
          reporting metrics such as impressions, clicks, spend, conversions,
          revenue, and related trend insights.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Authorized access only</h2>
        <p className="text-muted-foreground">
          Addashly only accesses account data after explicit user
          authorization. We use platform APIs for reporting and analytics use
          cases and do not engage in policy-violating behavior.
        </p>
      </section>

      <section className="mt-8">
        <p className="text-sm text-muted-foreground">
          Learn more in our <Link href="/privacy" className="underline">Privacy Policy</Link> and <Link href="/terms" className="underline">Terms</Link>.
        </p>
      </section>
    </main>
  );
}

