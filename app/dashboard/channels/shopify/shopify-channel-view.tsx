"use client";

import { useMemo, useState } from "react";
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
import { ShopifySyncButton } from "@/app/dashboard/analytics/shopify-sync-button";
import { ShopifyDisconnectButton } from "@/app/dashboard/shopify-disconnect-button";

type ShopifyOrderRow = {
  order_date: string;
  net_revenue: number;
  total_orders: number;
};

type ShopifyProductRow = {
  product_title: string;
  total_revenue: number;
  total_orders: number;
};

type Props = {
  clientId: string;
  storeLabel: string;
  orders: ShopifyOrderRow[];
  products: ShopifyProductRow[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtcDayTs(date: string) {
  return new Date(`${date}T00:00:00Z`).getTime();
}

export function ShopifyChannelView({ clientId, storeLabel, orders, products }: Props) {
  const [range, setRange] = useState<"1" | "7" | "30">("7");

  const view = useMemo(() => {
    const now = new Date();
    const endTs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const startTs = endTs - (Number(range) - 1) * DAY_MS;

    const rows = orders.filter((row) => {
      const ts = toUtcDayTs(row.order_date);
      return ts >= startTs && ts <= endTs;
    });

    const totalRevenue = rows.reduce((sum, row) => sum + Number(row.net_revenue), 0);
    const totalOrders = rows.reduce((sum, row) => sum + Number(row.total_orders), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const topRevenue = products[0]?.total_revenue ?? 0;

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      conversionRate: 3.4,
      topRevenue,
    };
  }, [range, orders, products]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">
            Shopify <Badge className="ml-2 bg-emerald-100 text-emerald-700">Live</Badge>
          </h2>
          <p className="mt-1 text-sm text-zinc-500">Store revenue and orders</p>
        </div>
        <DateRangeTabs value={range} onChange={setRange} />
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold">Shopify</p>
            <p className="text-sm text-zinc-500">Store: {storeLabel} · Status: Active</p>
          </div>
          <div className="flex items-center gap-3">
            <ShopifySyncButton />
            <ShopifyDisconnectButton clientId={clientId} />
            <Badge className="bg-emerald-100 text-emerald-700">Connected</Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-500">TOTAL REVENUE</CardTitle></CardHeader>
            <CardContent><p className="text-5xl font-semibold text-emerald-500">${view.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 1 })}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-500">TOTAL ORDERS</CardTitle></CardHeader>
            <CardContent><p className="text-5xl font-semibold">{view.totalOrders.toLocaleString()}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-500">AVG ORDER VALUE</CardTitle></CardHeader>
            <CardContent><p className="text-5xl font-semibold">${view.avgOrderValue.toFixed(2)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-500">CONVERSION RATE</CardTitle></CardHeader>
            <CardContent><p className="text-5xl font-semibold">{view.conversionRate.toFixed(1)}%</p></CardContent>
          </Card>
        </div>

        <Card className="mt-4">
          <CardHeader><CardTitle>Top Products by Revenue</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PRODUCT</TableHead>
                  <TableHead>ORDERS</TableHead>
                  <TableHead>REVENUE</TableHead>
                  <TableHead>AVG PRICE</TableHead>
                  <TableHead>% OF TOTAL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((row) => {
                  const avgPrice = row.total_orders > 0 ? row.total_revenue / row.total_orders : 0;
                  const share = view.topRevenue > 0 ? (row.total_revenue / view.topRevenue) * 100 : 0;
                  return (
                    <TableRow key={row.product_title}>
                      <TableCell className="font-medium">{row.product_title}</TableCell>
                      <TableCell>{Number(row.total_orders).toLocaleString()}</TableCell>
                      <TableCell>${Number(row.total_revenue).toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                      <TableCell>${avgPrice.toFixed(0)}</TableCell>
                      <TableCell>
                        <Badge className={share >= 25 ? "bg-emerald-100 text-emerald-700" : share >= 18 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}>
                          {share.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
