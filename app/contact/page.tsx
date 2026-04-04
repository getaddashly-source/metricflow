export const metadata = {
  title: "Contact | Addashly",
  description: "Contact Addashly support",
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Contact Addashly</h1>
      <p className="mt-4 text-muted-foreground">
        For support, compliance, or API-related questions, contact us using the
        email below.
      </p>

      <div className="mt-8 rounded-lg border p-6">
        <p className="text-sm text-muted-foreground">Primary contact email</p>
        <a href="mailto:Hello@addashly.com" className="mt-1 block text-lg font-medium underline">
          Hello@addashly.com
        </a>
        <p className="mt-3 text-sm text-muted-foreground">
          For Google Ads API compliance inquiries, include your organization
          name, account email, and request type in your message subject.
        </p>
      </div>

      <section className="mt-8 rounded-lg border p-6">
        <h2 className="text-lg font-semibold">Compliance and policy links</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-sm text-muted-foreground">
          <li><a href="/google-ads-api" className="underline">Google Ads API Use Case</a></li>
          <li><a href="/privacy" className="underline">Privacy Policy</a></li>
          <li><a href="/terms" className="underline">Terms of Service</a></li>
          <li><a href="/data-deletion" className="underline">Data Deletion</a></li>
        </ul>
      </section>
    </main>
  );
}

