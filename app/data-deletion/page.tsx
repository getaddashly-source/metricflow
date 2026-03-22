export const metadata = {
  title: "Data Deletion | Addashly",
  description: "Request deletion of your Addashly data",
};

export default function DataDeletionPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Addashly Data Deletion Request</h1>
      <p className="mt-4 text-muted-foreground">
        If you want your connected platform data removed from Addashly, send a
        request using the contact email below.
      </p>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">How to request deletion</h2>
        <ol className="list-decimal space-y-2 pl-6 text-muted-foreground">
          <li>Email <a href="mailto:Hello@addashly.com" className="underline">Hello@addashly.com</a> from your registered account email.</li>
          <li>Include your account identifier and connected platform details.</li>
          <li>Use the subject line: <strong>Data Deletion Request</strong>.</li>
        </ol>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Processing timeline</h2>
        <p className="text-muted-foreground">
          We process verified deletion requests as quickly as possible and
          typically complete them within 30 days, unless legal retention
          obligations require otherwise.
        </p>
        <p className="text-muted-foreground">
          For Meta (Facebook) platform users, deletion requests may also be
          submitted through Meta&apos;s in-product flow, which calls our callback
          endpoint at <span className="font-medium">/api/meta/data-deletion</span>.
        </p>
      </section>
    </main>
  );
}

