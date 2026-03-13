export const metadata = {
  title: "Contact | MetricFlow",
  description: "Contact MetricFlow support",
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Contact</h1>
      <p className="mt-4 text-muted-foreground">
        For support, compliance, or API-related questions, contact us using the
        email below.
      </p>

      <div className="mt-8 rounded-lg border p-6">
        <p className="text-sm text-muted-foreground">Primary contact email</p>
        <a href="mailto:getaddashly@gmail.com" className="mt-1 block text-lg font-medium underline">
          getaddashly@gmail.com
        </a>
      </div>
    </main>
  );
}