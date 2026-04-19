"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { login } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PendingAction = "login" | null;

export function LoginForm() {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [isPending, startTransition] = useTransition();

  const pendingLabel = pendingAction === "login" ? "Logging in..." : "Logging in...";

  function handleLogin(formData: FormData) {
    setPendingAction("login");
    startTransition(() => {
      void login(formData);
    });
  }

  return (
    <form className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@agency.com"
          required
          disabled={isPending}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          required
          minLength={6}
          disabled={isPending}
        />
      </div>

      <div className="pt-2">
        {isPending ? (
          <Button className="w-full" disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {pendingLabel}
          </Button>
        ) : (
          <Button formAction={handleLogin} className="w-full">
            Log in
          </Button>
        )}
      </div>

      <p className="text-center text-xs text-zinc-500">
        Accounts are created by admin only. Contact your admin for access.
      </p>
    </form>
  );
}
