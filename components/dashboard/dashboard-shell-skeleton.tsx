import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton";

export function DashboardShellSkeleton({ children }: { children?: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <div className="mx-auto flex min-h-screen w-full max-w-425">
        <aside className="hidden w-65 flex-col border-r border-zinc-200 bg-zinc-50 lg:flex">
          <div className="border-b border-zinc-200 px-6 py-6">
            <Skeleton className="h-8 w-36" />
          </div>

          <div className="flex-1 space-y-6 px-4 py-6">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>

          <div className="border-t border-zinc-200 p-4">
            <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 lg:px-8">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-8 w-24" />
          </header>

          <main className="flex-1 p-4 lg:p-8">{children ?? <DashboardPageSkeleton />}</main>
        </div>
      </div>
    </div>
  );
}
