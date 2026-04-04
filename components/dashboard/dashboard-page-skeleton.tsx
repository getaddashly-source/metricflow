import { Skeleton } from "@/components/ui/skeleton";

export function DashboardPageSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-52" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-56 rounded-xl" />
      </div>

      <Skeleton className="h-px w-full" />

      <div className="grid gap-4 xl:grid-cols-12">
        <Skeleton className="h-64 rounded-2xl xl:col-span-4" />
        <Skeleton className="h-64 rounded-2xl xl:col-span-2" />
        <Skeleton className="h-64 rounded-2xl xl:col-span-2" />
        <Skeleton className="h-64 rounded-2xl xl:col-span-2" />
        <Skeleton className="h-64 rounded-2xl xl:col-span-2" />
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Skeleton className="h-96 rounded-2xl xl:col-span-8" />
        <Skeleton className="h-96 rounded-2xl xl:col-span-4" />
      </div>

      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}
