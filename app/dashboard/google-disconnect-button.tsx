"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DisconnectConfirmDialog } from "@/components/dashboard/disconnect-confirm-dialog";
import { Unplug } from "lucide-react";
import { toast } from "sonner";

export function GoogleDisconnectButton({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const router = useRouter();

  async function handleDisconnect() {
    setLoading(true);
    try {
      const res = await fetch("/api/google/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId }),
      });

      if (res.ok) {
        setConfirmOpen(false);
        toast.success("Disconnected Google Ads account");
        setTimeout(() => router.refresh(), 1200);
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Google disconnect failed");
      }
    } catch {
      toast.error("Network error — check your connection");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)} disabled={loading}>
        <Unplug className="mr-1 h-3 w-3" />
        {loading ? "Disconnecting..." : "Disconnect"}
      </Button>

      <DisconnectConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleDisconnect}
        loading={loading}
        title="Disconnect Google Ads account?"
        description="This will stop future syncs and unlink this Google Ads account from your dashboard."
      />
    </div>
  );
}
