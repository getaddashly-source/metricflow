import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { LayoutDashboard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "./sidebar-nav";
import { AutoSyncRunner } from "./auto-sync-runner";
import { isUiDemoMode } from "@/lib/demo/mode";
import { requireAuthenticatedUserWithProfile } from "@/lib/auth/roles";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const demoMode = isUiDemoMode();
  const { user, profile } = await requireAuthenticatedUserWithProfile();

  const initials = (user.email ?? "U").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <div className="mx-auto flex min-h-screen w-full max-w-425">
        <aside className="hidden w-65 flex-col border-r border-zinc-200 bg-zinc-50 lg:flex">
          <div className="border-b border-zinc-200 px-6 py-6">
            <p className="text-3xl font-bold tracking-tight">Addashly</p>
          </div>
          <SidebarNav isAdmin={profile.role === "admin"} />

          <div className="border-t border-zinc-200 p-4">
            <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user.email}</p>
                <p className="text-xs text-zinc-500">Agency plan</p>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 lg:px-8">
            <div className="flex items-center gap-3 lg:hidden">
              <LayoutDashboard className="h-5 w-5 text-blue-600" />
              <p className="text-lg font-semibold">Addashly</p>
            </div>
            <p className="hidden text-sm text-zinc-500 lg:block">{user.email}</p>
            <form action={signOut}>
              <Button variant="outline" size="sm" type="submit">
                <LogOut className="mr-1 h-4 w-4" />
                Sign out
              </Button>
            </form>
          </header>

          <main className="flex-1 p-4 lg:p-8">
            <AutoSyncRunner userId={user.id} enabled={!demoMode} />
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}


