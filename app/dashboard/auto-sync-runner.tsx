"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type Props = {
  userId: string;
  enabled: boolean;
};

const SYNC_ENDPOINTS = {
  meta: "/api/meta/sync",
  google: "/api/google/sync",
  shopify: "/api/shopify/sync",
} as const;

type SyncKey = keyof typeof SYNC_ENDPOINTS;

function routeSyncTargets(pathname: string): SyncKey[] {
  if (pathname.startsWith("/dashboard/channels/meta-ads")) return ["meta"];
  if (pathname.startsWith("/dashboard/channels/google-ads")) return ["google"];
  if (pathname.startsWith("/dashboard/channels/shopify")) return ["shopify"];

  if (
    pathname.startsWith("/dashboard/analytics") ||
    pathname.startsWith("/dashboard/performance")
  ) {
    return ["meta", "google", "shopify"];
  }

  return [];
}

function storageKey(userId: string, key: SyncKey): string {
  return `auto-sync:${userId}:${key}`;
}

export function AutoSyncRunner({ userId, enabled }: Props) {
  const pathname = usePathname();

  useEffect(() => {
    if (!enabled) return;

    const targets = routeSyncTargets(pathname);
    if (targets.length === 0) return;

    for (const target of targets) {
      const key = storageKey(userId, target);
      const state = sessionStorage.getItem(key);

      if (state === "done" || state === "running") continue;

      sessionStorage.setItem(key, "running");

      void fetch(SYNC_ENDPOINTS[target], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
        .catch(() => null)
        .finally(() => {
          sessionStorage.setItem(key, "done");
        });
    }
  }, [enabled, pathname, userId]);

  return null;
}
