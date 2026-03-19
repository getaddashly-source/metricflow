"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateRangeTabs } from "@/components/dashboard/date-range-tabs";
import {
  Activity,
  DollarSign,
  Eye,
  ShoppingBasket,
  Target,
  Users,
} from "lucide-react";

type MetaRow = {
  date_start: string;
  impressions: number;
  spend: number;
  conversions: number;
  conversion_value: number;
};

type GoogleRow = {
  date_start: string;
  impressions: number;
  spend: number;
  conversions: number;
  conversion_value: number;
};

type ShopifyRow = {
  order_date: string;
  net_revenue: number;
  total_orders: number;
};

type WeekAgg = {
  revenue: number;
  spend: number;
  orders: number;
  conversions: number;
};

type Props = {
  metaRows: MetaRow[];
  googleRows: GoogleRow[];
  shopifyRows: ShopifyRow[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

const currencyCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const currencyFull = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const integer = new Intl.NumberFormat("en-US");

function toUtcDayTs(date: string) {
  return new Date(`${date}T00:00:00Z`).getTime();
}

function inRange(ts: number, startTs: number, endTs: number) {
  return ts >= startTs && ts <= endTs;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(value, 100));
}

function weekStartUtc(ts: number) {
  const d = new Date(ts);
  const day = d.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diffToMonday);
}

function weekLabel(weekStart: number, currentWeekStart: number) {
  const oneWeek = 7 * DAY_MS;
  if (weekStart === currentWeekStart) return "This Week";
  if (weekStart === currentWeekStart - oneWeek) return "Last Week";
  return new Date(weekStart).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function signalFromRoas(roas: number) {
  if (roas >= 4) return { label: "Scale", className: "bg-emerald-100 text-emerald-700" };
  if (roas >= 3) return { label: "Hold", className: "bg-amber-100 text-amber-700" };
  return { label: "Cut", className: "bg-rose-100 text-rose-700" };
}

function MetricProgressCard({
  icon,
  iconClass,
  value,
  label,
  leftText,
  rightText,
  percent,
  barClass,
}: {
  icon: ReactNode;
  iconClass: string;
  value: string;
  label: string;
  leftText: string;
  rightText: string;
  percent: number;
  barClass: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className={`grid h-11 w-11 place-items-center rounded-xl border ${iconClass}`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-5xl font-semibold tracking-tight text-zinc-900">{value}</p>
        <p className="mt-1 text-zinc-500">{label}</p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-200">
          <div className={`h-full rounded-full ${barClass}`} style={{ width: `${clampPercent(percent)}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-sm text-zinc-400">
          <span>{leftText}</span>
          <span>{rightText}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function PerformanceClientView({ metaRows, googleRows, shopifyRows }: Props) {
  const [range, setRange] = useState<"1" | "7" | "30">("7");

  const view = useMemo(() => {
    const now = new Date();
    const endTs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const startTs = endTs - (Number(range) - 1) * DAY_MS;

    const filteredMeta = metaRows.filter((row) => inRange(toUtcDayTs(row.date_start), startTs, endTs));
    const filteredGoogle = googleRows.filter((row) => inRange(toUtcDayTs(row.date_start), startTs, endTs));
    const filteredShopify = shopifyRows.filter((row) => inRange(toUtcDayTs(row.order_date), startTs, endTs));

    const adRows = [...filteredMeta, ...filteredGoogle];

    const totalSpend = adRows.reduce((sum, row) => sum + Number(row.spend), 0);
    const totalConversions = adRows.reduce((sum, row) => sum + Number(row.conversions), 0);
    const attributedRevenue = adRows.reduce((sum, row) => sum + Number(row.conversion_value), 0);
    const totalImpressions = adRows.reduce((sum, row) => sum + Number(row.impressions), 0);

    const shopifyRevenue = filteredShopify.reduce((sum, row) => sum + Number(row.net_revenue), 0);
    const totalOrders = filteredShopify.reduce((sum, row) => sum + Number(row.total_orders), 0);

    const totalRevenue = attributedRevenue + shopifyRevenue;
    const blendedRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0;

    const roasTarget = 5;
    const revenueTarget = 100000;
    const spendBudget = 40000;
    const ordersTarget = 2000;
    const cpaMax = 50;
    const impressionsTarget = 200000;

    const weekMap = new Map<number, WeekAgg>();
    const thisWeekStart = weekStartUtc(endTs);

    for (const row of adRows) {
      const ts = toUtcDayTs(row.date_start);
      const wk = weekStartUtc(ts);
      const current = weekMap.get(wk) ?? { revenue: 0, spend: 0, orders: 0, conversions: 0 };
      current.revenue += Number(row.conversion_value);
      current.spend += Number(row.spend);
      current.conversions += Number(row.conversions);
      weekMap.set(wk, current);
    }

    for (const row of filteredShopify) {
      const ts = toUtcDayTs(row.order_date);
      const wk = weekStartUtc(ts);
      const current = weekMap.get(wk) ?? { revenue: 0, spend: 0, orders: 0, conversions: 0 };
      current.revenue += Number(row.net_revenue);
      current.orders += Number(row.total_orders);
      weekMap.set(wk, current);
    }

    const weeklyRows = Array.from(weekMap.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([weekStart, agg]) => {
        const roas = agg.spend > 0 ? agg.revenue / agg.spend : 0;
        const weeklyCpa = agg.conversions > 0 ? agg.spend / agg.conversions : 0;
        const signal = signalFromRoas(roas);
        return {
          week: weekLabel(weekStart, thisWeekStart),
          revenue: agg.revenue,
          spend: agg.spend,
          roas,
          orders: agg.orders,
          cpa: weeklyCpa,
          signal,
        };
      });

    return {
      totalRevenue,
      blendedRoas,
      totalSpend,
      totalOrders,
      cpa,
      totalImpressions,
      roasTarget,
      revenueTarget,
      spendBudget,
      ordersTarget,
      cpaMax,
      impressionsTarget,
      weeklyRows,
    };
  }, [range, metaRows, googleRows, shopifyRows]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Performance</h2>
          <p className="mt-1 text-sm text-zinc-500">Deep dive into all metrics</p>
        </div>
        <DateRangeTabs value={range} onChange={setRange} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricProgressCard
          icon={<Activity className="h-5 w-5 text-blue-500" />}
          iconClass="border-blue-200 bg-blue-50"
          value={`${view.blendedRoas.toFixed(1)}x`}
          label="Blended ROAS"
          leftText="0x"
          rightText={`Target ${view.roasTarget}x`}
          percent={(view.blendedRoas / view.roasTarget) * 100}
          barClass="bg-blue-500"
        />
        <MetricProgressCard
          icon={<DollarSign className="h-5 w-5 text-emerald-500" />}
          iconClass="border-emerald-200 bg-emerald-50"
          value={currencyCompact.format(view.totalRevenue)}
          label="Total Revenue"
          leftText="$0"
          rightText={`${currencyCompact.format(view.revenueTarget)} target`}
          percent={(view.totalRevenue / view.revenueTarget) * 100}
          barClass="bg-emerald-500"
        />
        <MetricProgressCard
          icon={<ShoppingBasket className="h-5 w-5 text-amber-500" />}
          iconClass="border-amber-200 bg-amber-50"
          value={currencyCompact.format(view.totalSpend)}
          label="Total Ad Spend"
          leftText="$0"
          rightText={`${currencyCompact.format(view.spendBudget)} budget`}
          percent={(view.totalSpend / view.spendBudget) * 100}
          barClass="bg-amber-500"
        />
        <MetricProgressCard
          icon={<Users className="h-5 w-5 text-violet-500" />}
          iconClass="border-violet-200 bg-violet-50"
          value={integer.format(view.totalOrders)}
          label="Total Orders"
          leftText="0"
          rightText={`${integer.format(view.ordersTarget)} target`}
          percent={(view.totalOrders / view.ordersTarget) * 100}
          barClass="bg-violet-500"
        />
        <MetricProgressCard
          icon={<Target className="h-5 w-5 text-rose-500" />}
          iconClass="border-rose-200 bg-rose-50"
          value={currencyFull.format(view.cpa)}
          label="CPA"
          leftText="$0"
          rightText={`${currencyFull.format(view.cpaMax)} max`}
          percent={(view.cpa / view.cpaMax) * 100}
          barClass="bg-rose-500"
        />
        <MetricProgressCard
          icon={<Eye className="h-5 w-5 text-cyan-500" />}
          iconClass="border-cyan-200 bg-cyan-50"
          value={currencyCompact.format(view.totalImpressions).replace("$", "")}
          label="Impressions"
          leftText="0"
          rightText={`${currencyCompact.format(view.impressionsTarget).replace("$", "")} target`}
          percent={(view.totalImpressions / view.impressionsTarget) * 100}
          barClass="bg-cyan-500"
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="font-semibold">Weekly Breakdown</CardTitle>
          <p className="text-sm text-zinc-500">Revenue and ROAS by week</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>WEEK</TableHead>
                <TableHead>REVENUE</TableHead>
                <TableHead>SPEND</TableHead>
                <TableHead>BLENDED ROAS</TableHead>
                <TableHead>ORDERS</TableHead>
                <TableHead>CPA</TableHead>
                <TableHead>SIGNAL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {view.weeklyRows.length > 0 ? (
                view.weeklyRows.map((row) => (
                  <TableRow key={row.week}>
                    <TableCell className="font-medium">{row.week}</TableCell>
                    <TableCell>{currencyFull.format(row.revenue)}</TableCell>
                    <TableCell>{currencyFull.format(row.spend)}</TableCell>
                    <TableCell className={row.roas >= 4 ? "text-emerald-600" : row.roas >= 3 ? "text-amber-600" : "text-rose-600"}>
                      {row.roas.toFixed(1)}x
                    </TableCell>
                    <TableCell>{integer.format(row.orders)}</TableCell>
                    <TableCell>{currencyFull.format(row.cpa)}</TableCell>
                    <TableCell>
                      <Badge className={row.signal.className}>{row.signal.label}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-zinc-500">
                    No weekly data available in selected range.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
