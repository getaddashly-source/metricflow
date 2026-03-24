"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Unplug } from "lucide-react";

export function DisconnectButton({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  async function handleDisconnect() {
    if (!confirm("Are you sure you want to disconnect this Meta Ad Account?")) {
      return;
    }

    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/meta/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId }),
      });

      if (res.ok) {
        setResult("Disconnected Meta Ads account");
        setTimeout(() => router.refresh(), 1200);
      } else {
        const body = await res.json().catch(() => ({}));
        setResult(`Error: ${body.error ?? "Disconnect failed"}`);
      }
    } catch {
      setResult("Error: Network error — check your connection");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span
          className={`text-sm ${result.startsWith("Error") ? "text-red-600" : "text-green-600"}`}
        >
          {result}
        </span>
      )}
      <Button
        variant="destructive"
        size="sm"
        onClick={handleDisconnect}
        disabled={loading}
      >
        <Unplug className="mr-1 h-3 w-3" />
        {loading ? "Disconnecting..." : "Disconnect"}
      </Button>
    </div>
  );
}
