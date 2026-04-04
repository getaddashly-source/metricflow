"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus } from "lucide-react";

export function ShopifyConnectForm({ clientId }: { clientId: string }) {
  const [shop, setShop] = useState("");
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(false);

  function handleConnect() {
    setError("");
    setConnecting(true);

    // Normalize: add .myshopify.com if user just typed the store name
    let domain = shop.trim().toLowerCase();
    if (!domain) {
      setError("Please enter your Shopify store domain");
      setConnecting(false);
      return;
    }

    // Remove https:// or http:// if pasted
    domain = domain.replace(/^https?:\/\//, "");
    // Remove trailing slash
    domain = domain.replace(/\/$/, "");
    // Remove /admin or other paths
    domain = domain.split("/")[0];

    // Add .myshopify.com if not present
    if (!domain.endsWith(".myshopify.com")) {
      domain = `${domain}.myshopify.com`;
    }

    // Validate
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(domain)) {
      setError("Invalid store domain. Example: my-store.myshopify.com");
      setConnecting(false);
      return;
    }

    // Redirect to the connect endpoint
    window.location.href = `/api/shopify/connect?client_id=${encodeURIComponent(clientId)}&shop=${encodeURIComponent(domain)}`;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          placeholder="my-store.myshopify.com"
          value={shop}
          onChange={(e) => setShop(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !connecting && handleConnect()}
          className="max-w-xs"
          disabled={connecting}
        />
        <Button onClick={handleConnect} disabled={connecting}>
          {connecting ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-1 h-4 w-4" />
          )}
          {connecting ? "Connecting..." : "Connect Shopify"}
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
