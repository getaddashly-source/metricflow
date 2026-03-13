import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">MetricFlow</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        Unified marketing analytics for authorized Google Ads, Meta, and
        Shopify accounts. Track campaign and commerce performance in one place.
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
          className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Open Dashboard
        </Link>
      </div>

      <section className="mt-12 grid gap-4 sm:grid-cols-2">
        <Link href="/about" className="rounded-lg border p-4 hover:bg-accent">
          <h2 className="font-semibold">About</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Learn about MetricFlow and authorized API usage.
          </p>
        </Link>
        <Link href="/privacy" className="rounded-lg border p-4 hover:bg-accent">
          <h2 className="font-semibold">Privacy Policy</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            How we collect, process, and retain analytics data.
          </p>
        </Link>
        <Link href="/terms" className="rounded-lg border p-4 hover:bg-accent">
          <h2 className="font-semibold">Terms of Service</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Terms for using the MetricFlow platform.
          </p>
        </Link>
        <Link href="/contact" className="rounded-lg border p-4 hover:bg-accent">
          <h2 className="font-semibold">Contact</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Reach support for policy and compliance questions.
          </p>
        </Link>
      </section>
    </main>
  );
}
