import { DashboardShellSkeleton } from "../../../components/dashboard/dashboard-shell-skeleton";
import { DashboardPageSkeleton } from "../../../components/dashboard/dashboard-page-skeleton";

export default function AnalyticsLoading() {
  return (
    <DashboardShellSkeleton>
      <DashboardPageSkeleton />
    </DashboardShellSkeleton>
  );
}
