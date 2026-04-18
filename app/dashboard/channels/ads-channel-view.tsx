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
import { Pagination } from "@/components/ui/pagination";
import { SyncButton } from "@/app/dashboard/analytics/sync-button";
import { GoogleSyncButton } from "@/app/dashboard/analytics/google-sync-button";
import { DisconnectButton } from "@/app/dashboard/disconnect-button";
import { GoogleDisconnectButton } from "@/app/dashboard/google-disconnect-button";
import { formatCompactNumber } from "@/lib/utils";

type Row = {
  campaign_id: string;
  campaign_name: string | null;
  date_start: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversion_value: number;
};

type Props = {
  title: string;
  subtitle: string;
  accountLabel: string;
  icon: ReactNode;
  iconClassName: string;
  rows: Row[];
  channelType: "meta" | "google";
  clientId: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtcDayTs(date: string) {
  return new Date(`${date}T00:00:00Z`).getTime();
}

function signalFromRoas(roas: number) {
  if (roas >= 4) return { label: "Scale", className: "bg-emerald-100 text-emerald-700" };
  if (roas >= 3) return { label: "Hold", className: "bg-amber-100 text-amber-700" };
  return { label: "Cut", className: "bg-rose-100 text-rose-700" };
}

export function AdsChannelView({
  title,
  subtitle,
  accountLabel,
  icon,
  iconClassName,
  rows,
  channelType,
  clientId,
}: Props) {
  const [range, setRange] = useState<"1" | "7" | "30">("7");
  const [dailyPage, setDailyPage] = useState(1);
  const dailyPageSize = 10;

  const view = useMemo(() => {
    const now = new Date();
    const endTs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const startTs = endTs - (Number(range) - 1) * DAY_MS;

    const filteredRows = rows.filter((row) => {
      const ts = toUtcDayTs(row.date_start);
      return ts >= startTs && ts <= endTs;
    });

    const totalSpend = filteredRows.reduce((sum, row) => sum + Number(row.spend), 0);
    const totalRevenue = filteredRows.reduce((sum, row) => sum + Number(row.conversion_value), 0);
    const totalImpressions = filteredRows.reduce((sum, row) => sum + Number(row.impressions), 0);

    const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;

    const campaignMap = new Map<string, { name: string; spend: number; revenue: number; clicks: number }>();
    for (const row of filteredRows) {
      const current = campaignMap.get(row.campaign_id) ?? {
        name: row.campaign_name ?? "Unnamed Campaign",
        spend: 0,
        revenue: 0,
        clicks: 0,
      };
      current.spend += Number(row.spend);
      current.revenue += Number(row.conversion_value);
      current.clicks += Number(row.clicks);
      campaignMap.set(row.campaign_id, current);
    }

    const campaigns = Array.from(campaignMap.values())
      .map((row) => {
        const rowRoas = row.spend > 0 ? row.revenue / row.spend : 0;
        const cpc = row.clicks > 0 ? row.spend / row.clicks : 0;
        return { ...row, rowRoas, cpc, signal: signalFromRoas(rowRoas) };
      })
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 8);

    const dailyMap = new Map<string, { revenue: number; spend: number; conversions: number }>();

    for (const row of filteredRows) {
      const current = dailyMap.get(row.date_start) ?? {
        revenue: 0,
        spend: 0,
        conversions: 0,
      };

      current.revenue += Number(row.conversion_value);
      current.spend += Number(row.spend);
      current.conversions += Math.max(0, Math.round(Number(row.clicks) * 0.08));
      dailyMap.set(row.date_start, current);
    }

    const dailyRows = Array.from(dailyMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, metrics]) => {
        const rowRoas = metrics.spend > 0 ? metrics.revenue / metrics.spend : 0;
        const cpa = metrics.conversions > 0 ? metrics.spend / metrics.conversions : 0;
        return {
          date: new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          }),
          revenue: metrics.revenue,
          spend: metrics.spend,
          roas: rowRoas,
          cpa,
          signal: signalFromRoas(rowRoas),
        };
      });

    return { totalSpend, totalRevenue, cpm, roas, campaigns, dailyRows };
  }, [rows, range]);

  const dailyTotalPages = Math.max(1, Math.ceil(view.dailyRows.length / dailyPageSize));
  const safeDailyPage = Math.min(dailyPage, dailyTotalPages);
  const paginatedDailyRows = useMemo(() => {
    const start = (safeDailyPage - 1) * dailyPageSize;
    return view.dailyRows.slice(start, start + dailyPageSize);
  }, [safeDailyPage, view.dailyRows]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">
            {title} <Badge className="ml-2 bg-emerald-100 text-emerald-700">Live</Badge>
          </h2>
          <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
        </div>
        <DateRangeTabs value={range} onChange={setRange} />
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={iconClassName}>{icon}</div>
            <div>
              <p className="text-lg font-semibold">{title}</p>
              <p className="text-sm text-zinc-500">Account: {accountLabel} · Status: Active</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {channelType === "meta" ? <SyncButton /> : <GoogleSyncButton />}
            {channelType === "meta" ? (
              <DisconnectButton clientId={clientId} />
            ) : (
              <GoogleDisconnectButton clientId={clientId} />
            )}
            <Badge className="bg-emerald-100 text-emerald-700">Connected</Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-500">ROAS</CardTitle></CardHeader>
            <CardContent><p className="text-5xl font-semibold">{view.roas.toFixed(1)}x</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-500">SPEND</CardTitle></CardHeader>
            <CardContent><p className="text-5xl font-semibold">{formatCompactNumber(view.totalSpend, 1, "$")}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-500">REVENUE ATTRIBUTED</CardTitle></CardHeader>
            <CardContent><p className="text-5xl font-semibold">{formatCompactNumber(view.totalRevenue, 1, "$")}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-500">CPM</CardTitle></CardHeader>
            <CardContent><p className="text-5xl font-semibold">${view.cpm.toFixed(2)}</p></CardContent>
          </Card>
        </div>

        <Card className="mt-4">
          <CardHeader><CardTitle>Campaign Breakdown</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CAMPAIGN</TableHead>
                  <TableHead>SPEND</TableHead>
                  <TableHead>REVENUE</TableHead>
                  <TableHead>ROAS</TableHead>
                  <TableHead>CPC</TableHead>
                  <TableHead>STATUS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {view.campaigns.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{formatCompactNumber(row.spend, 1, "$")}</TableCell>
                    <TableCell>{formatCompactNumber(row.revenue, 1, "$")}</TableCell>
                    <TableCell className={row.rowRoas >= 4 ? "text-emerald-600" : row.rowRoas >= 3 ? "text-amber-600" : "text-rose-600"}>{row.rowRoas.toFixed(1)}x</TableCell>
                    <TableCell>${row.cpc.toFixed(2)}</TableCell>
                    <TableCell><Badge className={row.signal.className}>{row.signal.label}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader><CardTitle>Daily Performance</CardTitle></CardHeader>
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
                    <TableCell>{formatCompactNumber(row.revenue, 1, "$")}</TableCell>
                    <TableCell>{formatCompactNumber(row.spend, 1, "$")}</TableCell>
                    <TableCell className={row.roas >= 4 ? "text-emerald-600" : row.roas >= 3 ? "text-amber-600" : "text-rose-600"}>
                      {row.roas.toFixed(1)}x
                    </TableCell>
                    <TableCell>{formatCompactNumber(row.cpa, 1, "$")}</TableCell>
                    <TableCell><Badge className={row.signal.className}>{row.signal.label}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Pagination
              page={safeDailyPage}
              totalItems={view.dailyRows.length}
              pageSize={dailyPageSize}
              onPageChange={setDailyPage}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
