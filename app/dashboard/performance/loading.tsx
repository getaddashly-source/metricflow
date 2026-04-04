import { DashboardShellSkeleton } from "../../../components/dashboard/dashboard-shell-skeleton";
import { PerformancePageSkeleton } from "../../../components/dashboard/performance-page-skeleton";

export default function PerformanceLoading() {
  return (
    <DashboardShellSkeleton>
      <PerformancePageSkeleton />
    </DashboardShellSkeleton>
  );
}
