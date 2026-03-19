"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  Bell,
  Circle,
  LayoutDashboard,
  LineChart,
  Settings,
  ShoppingBag,
  Users,
} from "lucide-react";

function SidebarLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
}) {
  const className = active
    ? "flex items-center gap-3 rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700"
    : "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100";

  return (
    <Link href={href} className={className}>
      {icon}
      {label}
    </Link>
  );
}

export function SidebarNav() {
  const pathname = usePathname();

  const isDashboard = pathname === "/dashboard/analytics";
  const isPerformance = pathname === "/dashboard/performance";
  const isMeta = pathname === "/dashboard/channels/meta-ads";
  const isGoogle = pathname === "/dashboard/channels/google-ads";
  const isShopify = pathname === "/dashboard/channels/shopify";

  return (
    <div className="flex-1 space-y-6 px-4 py-6">
      <div className="space-y-2">
        <p className="px-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">Overview</p>
        <SidebarLink
          href="/dashboard/analytics"
          label="Dashboard"
          icon={<LayoutDashboard className="h-4 w-4" />}
          active={isDashboard}
        />
        <SidebarLink
          href="/dashboard/performance"
          label="Performance"
          icon={<LineChart className="h-4 w-4" />}
          active={isPerformance}
        />
      </div>

      <div className="space-y-2">
        <p className="px-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">Channels</p>
        <SidebarLink
          href="/dashboard/channels/meta-ads"
          label="Meta Ads"
          icon={<Circle className="h-4 w-4" />}
          active={isMeta}
        />
        <SidebarLink
          href="/dashboard/channels/google-ads"
          label="Google Ads"
          icon={<Circle className="h-4 w-4" />}
          active={isGoogle}
        />
        <SidebarLink
          href="/dashboard/channels/shopify"
          label="Shopify"
          icon={<ShoppingBag className="h-4 w-4" />}
          active={isShopify}
        />
      </div>

      <div className="space-y-2">
        <p className="px-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">Manage</p>
        <div className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-zinc-600">
          <Users className="h-4 w-4" />
          Clients
        </div>
        <div className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-zinc-600">
          <Bell className="h-4 w-4" />
          Alerts
        </div>
        <div className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-zinc-600">
          <Settings className="h-4 w-4" />
          Settings
        </div>
      </div>
    </div>
  );
}
