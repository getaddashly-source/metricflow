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
import { SyncButton } from "@/app/dashboard/analytics/sync-button";
import { GoogleSyncButton } from "@/app/dashboard/analytics/google-sync-button";
import { DisconnectButton } from "@/app/dashboard/disconnect-button";
import { GoogleDisconnectButton } from "@/app/dashboard/google-disconnect-button";

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

    return { totalSpend, totalRevenue, cpm, roas, campaigns };
  }, [rows, range]);

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
            <CardContent><p className="text-5xl font-semibold">${view.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-500">REVENUE ATTRIBUTED</CardTitle></CardHeader>
            <CardContent><p className="text-5xl font-semibold">${view.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></CardContent>
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
                    <TableCell>${row.spend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                    <TableCell>${row.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                    <TableCell className={row.rowRoas >= 4 ? "text-emerald-600" : row.rowRoas >= 3 ? "text-amber-600" : "text-rose-600"}>{row.rowRoas.toFixed(1)}x</TableCell>
                    <TableCell>${row.cpc.toFixed(2)}</TableCell>
                    <TableCell><Badge className={row.signal.className}>{row.signal.label}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
