import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Addashly</CardTitle>
          <CardDescription>
            Sign in to your marketing analytics dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {params.error ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {params.error}
              </p>
            ) : null}
            {params.message ? (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {params.message}
              </p>
            ) : null}
            <LoginForm />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


