"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import {
  ArrowUpRight,
  Bell,
  ChartNoAxesColumn,
  CircleAlert,
  CircleCheck,
  CircleDollarSign,
  Facebook,
  Gauge,
  Globe,
  HandCoins,
  Target,
  TrendingDown,
  Wallet,
} from "lucide-react";
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
import { Pagination } from "@/components/ui/pagination";

type SignalType = "scale" | "hold" | "cut";

type TrendPoint = {
  label: string;
  revenue: number;
  spend: number;
};

type DailyRow = {
  date: string;
  revenue: number;
  spend: number;
  roas: number;
  cpa: number;
  signal: SignalType;
};

type ChannelRow = {
  channel: "Meta Ads" | "Google Ads" | "Shopify";
  roas: number;
  revenue: number;
};

type AlertRow = {
  title: string;
  detail: string;
  level: "good" | "warn" | "danger";
  age: string;
};

type Summary = {
  blendedRoas: number;
  totalRevenue: number;
  totalSpend: number;
  mer: number;
  cpa: number;
  blendedVsLastWeek: number;
  previousPeriodRoas: number;
  targetRoas: number;
  revenueDelta: number;
  spendDelta: number;
  merDelta: number;
  cpaDelta: number;
};

type Props = {
  summary: Summary;
  trend: TrendPoint[];
  channels: ChannelRow[];
  dailyRows: DailyRow[];
  alerts: AlertRow[];
  rangeLabel: string;
};

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function compactCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function percent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function roasValue(value: number) {
  return `${value.toFixed(1)}x`;
}

function signalBadge(signal: SignalType) {
  if (signal === "scale") {
    return <Badge className="bg-emerald-100 text-emerald-700">Scale</Badge>;
  }

  if (signal === "hold") {
    return <Badge className="bg-amber-100 text-amber-700">Hold</Badge>;
  }

  return <Badge className="bg-rose-100 text-rose-700">Cut</Badge>;
}

function deltaPill(value: number, invert?: boolean) {
  const positive = invert ? value < 0 : value > 0;
  const className = positive
    ? "bg-emerald-100 text-emerald-700"
    : "bg-rose-100 text-rose-700";

  return <Badge className={className}>{percent(value)}</Badge>;
}

function summaryDeltaBadge(value: number, invert?: boolean) {
  const positive = invert ? value < 0 : value > 0;
  const className = positive
    ? "bg-emerald-100 text-emerald-700"
    : "bg-rose-100 text-rose-700";
  return (
    <Badge className={`h-7 rounded-full px-2.5 text-xs font-medium ${className}`}>
      {percent(value)}
    </Badge>
  );
}

export function AnalyticsDashboardView({
  summary,
  trend,
  channels,
  dailyRows,
  alerts,
  rangeLabel,
}: Props) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [tablePage, setTablePage] = useState(1);
  const tablePageSize = 10;

  useEffect(() => {
    if (!chartRef.current || trend.length === 0) return;

    const chart = echarts.init(chartRef.current);

    chart.setOption({
      grid: {
        top: 20,
        right: 10,
        bottom: 28,
        left: 8,
        containLabel: true,
      },
      tooltip: {
        trigger: "axis",
      },
      xAxis: {
        type: "category",
        data: trend.map((point) => point.label),
        axisLine: { lineStyle: { color: "#d4d4d8" } },
        axisLabel: { color: "#71717a" },
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "#e4e4e7" } },
        axisLabel: {
          color: "#71717a",
          formatter: (value: number) => `$${Math.round(value / 1000)}k`,
        },
      },
      series: [
        {
          name: "Revenue",
          type: "line",
          smooth: true,
          symbol: "circle",
          symbolSize: 7,
          lineStyle: { width: 3, color: "#3b82f6" },
          itemStyle: { color: "#3b82f6" },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(59, 130, 246, 0.2)" },
                { offset: 1, color: "rgba(59, 130, 246, 0.03)" },
              ],
            },
          },
          data: trend.map((point) => point.revenue),
        },
        {
          name: "Spend",
          type: "line",
          smooth: true,
          symbol: "none",
          lineStyle: { width: 2, color: "#9ca3af", type: "dashed" },
          data: trend.map((point) => point.spend),
        },
      ],
    });

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [trend]);

  const maxChannelRoas = useMemo(
    () => Math.max(...channels.map((channel) => channel.roas), 1),
    [channels],
  );

  const totalPages = Math.max(1, Math.ceil(dailyRows.length / tablePageSize));
  const safePage = Math.min(tablePage, totalPages);

  const paginatedDailyRows = useMemo(() => {
    const startIndex = (safePage - 1) * tablePageSize;
    return dailyRows.slice(startIndex, startIndex + tablePageSize);
  }, [dailyRows, safePage]);

  return (
    <div className="space-y-5">
      <div className="grid gap-2 xl:grid-cols-6">
        <Card className="overflow-hidden border-zinc-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md xl:col-span-2">
          <CardContent className="space-y-4 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-full border border-zinc-200 bg-white text-zinc-500">
                  <Gauge className="h-4 w-4" />
                </div>
                {summaryDeltaBadge(summary.blendedVsLastWeek)}
              </div>
              <div className="grid h-8 w-8 place-items-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-400">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>

            <div>
              <p className="text-3xl font-semibold tracking-tight text-zinc-900">
                {roasValue(summary.blendedRoas)}
              </p>
              <p className="mt-1 text-sm text-zinc-500">Blended ROAS</p>
            </div>

            <div className="grid gap-2 border-t border-zinc-100 pt-1 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-400">vs last week</p>
                <p className="mt-1 text-base font-semibold text-emerald-600">
                  {percent(summary.blendedVsLastWeek)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-400">last period</p>
                <p className="mt-1 text-base font-semibold text-zinc-700">
                  {roasValue(summary.previousPeriodRoas)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-400">target</p>
                <p className="mt-1 text-base font-semibold text-emerald-600">
                  {roasValue(summary.targetRoas)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-zinc-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
          <CardContent className="space-y-4 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-full border border-zinc-200 bg-white text-zinc-500">
                  <CircleDollarSign className="h-4 w-4" />
                </div>
                {summaryDeltaBadge(summary.revenueDelta)}
              </div>
              <div className="grid h-8 w-8 place-items-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-400">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-semibold tracking-tight text-zinc-900">
              {compactCurrency(summary.totalRevenue)}
            </p>
            <p className="text-sm text-zinc-500">Total Revenue</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-zinc-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
          <CardContent className="space-y-4 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-full border border-zinc-200 bg-white text-zinc-500">
                  <Wallet className="h-4 w-4" />
                </div>
                {summaryDeltaBadge(summary.spendDelta)}
              </div>
              <div className="grid h-8 w-8 place-items-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-400">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-semibold tracking-tight text-zinc-900">
              {compactCurrency(summary.totalSpend)}
            </p>
            <p className="text-sm text-zinc-500">Total Spend</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-zinc-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
          <CardContent className="space-y-4 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-full border border-zinc-200 bg-white text-zinc-500">
                  <Target className="h-4 w-4" />
                </div>
                {summaryDeltaBadge(summary.merDelta)}
              </div>
              <div className="grid h-8 w-8 place-items-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-400">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-semibold tracking-tight text-zinc-900">
              {roasValue(summary.mer)}
            </p>
            <p className="text-sm text-zinc-500">MER</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-zinc-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
          <CardContent className="space-y-4 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-full border border-zinc-200 bg-white text-zinc-500">
                  <HandCoins className="h-4 w-4" />
                </div>
                {summaryDeltaBadge(summary.cpaDelta, true)}
              </div>
              <div className="grid h-8 w-8 place-items-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-400">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-semibold tracking-tight text-zinc-900">
              {currency(summary.cpa)}
            </p>
            <p className="text-sm text-zinc-500">CPA</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="transition-shadow duration-200 hover:shadow-md xl:col-span-2">
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <ChartNoAxesColumn className="h-5 w-5 text-blue-500" />
              Revenue vs Spend
            </CardTitle>
            <p className="text-sm text-zinc-500">Daily trend for {rangeLabel}</p>
          </CardHeader>
          <CardContent>
            <div ref={chartRef} className="h-80 w-full" />
          </CardContent>
        </Card>

        <Card className="transition-shadow duration-200 hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Gauge className="h-5 w-5 text-blue-500" />
              Channel ROAS
            </CardTitle>
            <p className="text-sm text-zinc-500">By platform</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {channels.map((channel) => {
              const ratio = Math.max((channel.roas / maxChannelRoas) * 100, 8);
              const lineColor =
                channel.channel === "Meta Ads"
                  ? "bg-blue-500"
                  : channel.channel === "Google Ads"
                    ? "bg-rose-500"
                    : "bg-emerald-500";

              return (
                <div key={channel.channel} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 font-medium text-zinc-700">
                      {channel.channel === "Meta Ads" && <Facebook className="h-4 w-4" />}
                      {channel.channel === "Google Ads" && <Globe className="h-4 w-4" />}
                      {channel.channel === "Shopify" && <Target className="h-4 w-4" />}
                      {channel.channel}
                    </div>
                    <div className="text-right">
                      {channel.channel === "Shopify" ? (
                        <>
                          <p className="text-lg font-semibold text-zinc-900">{compactCurrency(channel.revenue)}</p>
                          <p className="text-xs text-zinc-500">Revenue</p>
                        </>
                      ) : (
                        <p className="text-lg font-semibold text-emerald-600">{roasValue(channel.roas)}</p>
                      )}
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
                    <div className={`h-full rounded-full ${lineColor}`} style={{ width: `${ratio}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="transition-shadow duration-200 hover:shadow-md xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Daily Performance</CardTitle>
              <p className="text-sm text-zinc-500">Revenue, spend and optimization signals</p>
            </div>
            <Badge variant="outline">Export CSV</Badge>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>DATE</TableHead>
                  <TableHead>REVENUE</TableHead>
                  <TableHead>SPEND</TableHead>
                  <TableHead>ROAS</TableHead>
                  <TableHead>CPA</TableHead>
                  <TableHead>SIGNAL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDailyRows.map((row) => (
                  <TableRow key={row.date}>
                    <TableCell className="font-medium">{row.date}</TableCell>
                    <TableCell>{currency(row.revenue)}</TableCell>
                    <TableCell>{currency(row.spend)}</TableCell>
                    <TableCell className={row.roas >= 4 ? "text-emerald-600" : row.roas >= 3 ? "text-amber-600" : "text-rose-600"}>
                      {roasValue(row.roas)}
                    </TableCell>
                    <TableCell>{currency(row.cpa)}</TableCell>
                    <TableCell>{signalBadge(row.signal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Pagination
              page={safePage}
              totalItems={dailyRows.length}
              pageSize={tablePageSize}
              onPageChange={setTablePage}
            />
          </CardContent>
        </Card>

        <Card className="transition-shadow duration-200 hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-2xl">
              <span className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-500" />
                Alerts
              </span>
              <Badge className="bg-rose-100 text-rose-700">{alerts.length} new</Badge>
            </CardTitle>
            <p className="text-sm text-zinc-500">Real-time signals</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.title} className="rounded-xl border border-zinc-200 p-3">
                <div className="mb-1 flex items-center gap-2">
                  {alert.level === "good" && <CircleCheck className="h-4 w-4 text-emerald-600" />}
                  {alert.level === "warn" && <CircleAlert className="h-4 w-4 text-amber-600" />}
                  {alert.level === "danger" && <TrendingDown className="h-4 w-4 text-rose-600" />}
                  <p className="text-base font-semibold text-zinc-800">{alert.title}</p>
                </div>
                <p className="text-sm text-zinc-600">{alert.detail}</p>
                <p className="mt-1 text-xs text-zinc-500">{alert.age}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
