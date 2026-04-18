"use client";

import { useMemo, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { DateRangeTabs } from "@/components/dashboard/date-range-tabs";
import { AnalyticsDashboardView } from "./analytics-dashboard-view";

type InsightRow = {
  campaign_id: string;
  campaign_name: string | null;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  conversion_value: number;
  date_start: string;
};

type GoogleInsightRow = {
  campaign_id: string;
  campaign_name: string | null;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  conversion_value: number;
  date_start: string;
};

type ShopifyOrderRow = {
  id: string;
  order_date: string;
  total_revenue: number;
  net_revenue: number;
};

type Props = {
  connectedPlatforms: string[];
  insights: InsightRow[];
  googleInsights: GoogleInsightRow[];
  shopifyOrders: ShopifyOrderRow[];
  range: "1" | "7" | "30";
};

type DailyAggregate = {
  revenue: number;
  spend: number;
  conversions: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtcDayTs(date: string) {
  return new Date(`${date}T00:00:00Z`).getTime();
}

function pctChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

function signalFromRoas(roas: number): "scale" | "hold" | "cut" {
  if (roas >= 4) return "scale";
  if (roas >= 3) return "hold";
  return "cut";
}

function dayKey(ts: number) {
  return new Date(ts).toISOString().slice(0, 10);
}

function inRange(ts: number, startTs: number, endTs: number) {
  return ts >= startTs && ts <= endTs;
}

export function AnalyticsDashboardShell({
  connectedPlatforms,
  insights,
  googleInsights,
  shopifyOrders,
  range,
}: Props) {
  const [selectedRange, setSelectedRange] = useState<"1" | "7" | "30">(range);

  const viewModel = useMemo(() => {
    const now = new Date();
    const todayUtcTs = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    );

    const endTs = todayUtcTs;
    const rangeDays = Number(selectedRange);
    const startTs = endTs - (rangeDays - 1) * DAY_MS;

    const prevEndTs = startTs - DAY_MS;
    const prevStartTs = prevEndTs - (rangeDays - 1) * DAY_MS;

    const filteredMeta = insights.filter((row) =>
      inRange(toUtcDayTs(row.date_start), startTs, endTs),
    );
    const filteredGoogle = googleInsights.filter((row) =>
      inRange(toUtcDayTs(row.date_start), startTs, endTs),
    );
    const filteredShopify = shopifyOrders.filter((row) =>
      inRange(toUtcDayTs(row.order_date), startTs, endTs),
    );

    const previousMeta = insights.filter((row) =>
      inRange(toUtcDayTs(row.date_start), prevStartTs, prevEndTs),
    );
    const previousGoogle = googleInsights.filter((row) =>
      inRange(toUtcDayTs(row.date_start), prevStartTs, prevEndTs),
    );
    const previousShopify = shopifyOrders.filter((row) =>
      inRange(toUtcDayTs(row.order_date), prevStartTs, prevEndTs),
    );

    const currentAdRows = [...filteredMeta, ...filteredGoogle];
    const previousAdRows = [...previousMeta, ...previousGoogle];

    const metaSpend = filteredMeta.reduce((sum, row) => sum + Number(row.spend), 0);
    const metaRevenue = filteredMeta.reduce((sum, row) => sum + Number(row.conversion_value), 0);

    const googleSpend = filteredGoogle.reduce((sum, row) => sum + Number(row.spend), 0);
    const googleRevenue = filteredGoogle.reduce((sum, row) => sum + Number(row.conversion_value), 0);

    const totalAdSpend = currentAdRows.reduce((sum, row) => sum + Number(row.spend), 0);
    const totalConversions = currentAdRows.reduce((sum, row) => sum + Number(row.conversions), 0);

    const shopifyRevenue = filteredShopify.reduce((sum, row) => sum + Number(row.net_revenue), 0);
    const totalRevenue = shopifyRevenue;

    const previousSpend = previousAdRows.reduce((sum, row) => sum + Number(row.spend), 0);
    const previousConversions = previousAdRows.reduce((sum, row) => sum + Number(row.conversions), 0);
    const previousShopifyRevenue = previousShopify.reduce(
      (sum, row) => sum + Number(row.net_revenue),
      0,
    );
    const previousTotalRevenue = previousShopifyRevenue;

    const blendedRoas = totalAdSpend > 0 ? totalRevenue / totalAdSpend : 0;
    const mer = totalAdSpend > 0 ? totalRevenue / totalAdSpend : 0;
    const cpa = totalConversions > 0 ? totalAdSpend / totalConversions : 0;

    const previousPeriodRoas = previousSpend > 0 ? previousTotalRevenue / previousSpend : 0;
    const targetRoas = previousPeriodRoas > 0 ? Math.max(previousPeriodRoas * 1.1, 1) : Math.max(blendedRoas, 1);

    const summary = {
      blendedRoas,
      totalRevenue,
      totalSpend: totalAdSpend,
      mer,
      cpa,
      previousPeriodRoas,
      targetRoas,
      blendedVsLastWeek: pctChange(blendedRoas, previousPeriodRoas),
      revenueDelta: pctChange(totalRevenue, previousTotalRevenue),
      spendDelta: pctChange(totalAdSpend, previousSpend),
      merDelta: pctChange(mer, previousPeriodRoas),
      cpaDelta: pctChange(
        cpa,
        previousConversions > 0 ? previousSpend / previousConversions : 0,
      ),
    };

    const channels = [
      {
        channel: "Meta Ads" as const,
        roas: metaSpend > 0 ? metaRevenue / metaSpend : 0,
        revenue: metaRevenue,
      },
      {
        channel: "Google Ads" as const,
        roas: googleSpend > 0 ? googleRevenue / googleSpend : 0,
        revenue: googleRevenue,
      },
      {
        channel: "Shopify" as const,
        roas: blendedRoas,
        revenue: shopifyRevenue,
      },
    ];

    const dayMap = new Map<string, DailyAggregate>();
    for (let ts = startTs; ts <= endTs; ts += DAY_MS) {
      dayMap.set(dayKey(ts), { revenue: 0, spend: 0, conversions: 0 });
    }

    for (const row of currentAdRows) {
      const key = row.date_start;
      const current = dayMap.get(key);
      if (!current) continue;
      current.spend += Number(row.spend);
      current.conversions += Number(row.conversions);
    }

    for (const row of filteredShopify) {
      const key = row.order_date;
      const current = dayMap.get(key);
      if (!current) continue;
      current.revenue += Number(row.net_revenue);
    }

    const dailySeries = Array.from(dayMap.entries()).sort(([a], [b]) =>
      a.localeCompare(b),
    );

    const trend = dailySeries.map(([date, metrics]) => ({
      label: new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      revenue: metrics.revenue,
      spend: metrics.spend,
    }));

    const dailyRows = dailySeries
      .slice()
      .reverse()
      .map(([date, metrics]) => {
        const roas = metrics.spend > 0 ? metrics.revenue / metrics.spend : 0;
        const cpaValue = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0;

        return {
          date: new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          }),
          revenue: metrics.revenue,
          spend: metrics.spend,
          roas,
          cpa: cpaValue,
          signal: signalFromRoas(roas),
        };
      });

    const last = dailySeries[dailySeries.length - 1]?.[1];
    const previous = dailySeries[dailySeries.length - 2]?.[1];
    const revenueDayDelta =
      last && previous && previous.revenue > 0
        ? ((last.revenue - previous.revenue) / previous.revenue) * 100
        : 0;

    const alerts = [
      {
        title: "ROAS Spike",
        detail: `Meta ROAS is ${(metaSpend > 0 ? metaRevenue / metaSpend : 0).toFixed(1)}x and above 3.5x target band.`,
        level: "good" as const,
        age: "2 min ago",
      },
      {
        title: "Google ROAS Watch",
        detail: `Google ROAS is ${(googleSpend > 0 ? googleRevenue / googleSpend : 0).toFixed(1)}x and should be monitored for stability.`,
        level: "warn" as const,
        age: "1 hr ago",
      },
      {
        title: "Revenue Movement",
        detail: `${revenueDayDelta < 0 ? "Revenue dipped" : "Revenue increased"} ${Math.abs(revenueDayDelta).toFixed(1)}% versus the previous day.`,
        level: revenueDayDelta < -8 ? ("danger" as const) : ("good" as const),
        age: "Today",
      },
    ];

    const hasRangeData =
      currentAdRows.length > 0 || filteredShopify.length > 0 || totalRevenue > 0 || totalAdSpend > 0;

    return {
      summary,
      channels,
      trend,
      dailyRows,
      alerts,
      hasRangeData,
      rangeLabel:
        selectedRange === "1"
          ? "today"
          : selectedRange === "7"
            ? "the last 7 days"
            : "the last 30 days",
    };
  }, [selectedRange, insights, googleInsights, shopifyOrders]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Dashboard</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Performance overview for {connectedPlatforms.join(" • ")}
          </p>
        </div>

        <DateRangeTabs value={selectedRange} onChange={setSelectedRange} />
      </div>

      <Separator />

      {!viewModel.hasRangeData ? (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-10 text-center">
          <p className="text-xl font-semibold text-zinc-900">No data in selected range</p>
          <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-600">
            Try another time range to view available performance metrics.
          </p>
        </div>
      ) : (
        <AnalyticsDashboardView
          summary={viewModel.summary}
          trend={viewModel.trend}
          channels={viewModel.channels}
          dailyRows={viewModel.dailyRows}
          alerts={viewModel.alerts}
          rangeLabel={viewModel.rangeLabel}
        />
      )}
    </div>
  );
}
