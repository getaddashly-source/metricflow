"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function ShopifySyncButton() {
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/shopify/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Shopify sync failed");
      } else {
        const failed = (body.results ?? []).filter(
          (r: { error?: string | null }) => !!r.error,
        );

        if (failed.length > 0) {
          const first = failed[0] as { store?: string; error?: string };
          toast.error(
            `${first.store ?? "Store"} sync failed${first.error ? ` (${first.error})` : ""}`,
          );
          return;
        }

        const total = body.results?.reduce(
          (sum: number, r: { synced: number }) => sum + r.synced,
          0,
        );
        toast.success(`Synced ${total} Shopify orders`);
        setTimeout(() => window.location.reload(), 1200);
      }
    } catch {
      toast.error("Network error — check your connection");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={handleSync} disabled={syncing} variant="outline">
        <RefreshCw
          className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`}
        />
        {syncing ? "Syncing…" : "Sync Shopify"}
      </Button>
    </div>
  );
}
