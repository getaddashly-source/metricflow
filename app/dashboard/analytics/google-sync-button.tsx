"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function GoogleSyncButton() {
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/google/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Google sync failed");
      } else {
        const total = body.results?.reduce((sum: number, r: { synced: number }) => sum + r.synced, 0);
        toast.success(`Synced ${total} Google insight rows`);
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
        <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Syncing…" : "Sync Google Data"}
      </Button>
    </div>
  );
}
