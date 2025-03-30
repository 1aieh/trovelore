// src/components/SyncShopify.tsx
"use client";

import { useEffect, useState } from "react";

// Custom event name to signal sync completion
export const SHOPIFY_SYNC_COMPLETE_EVENT = "shopify-sync-complete";

export default function SyncShopify() {
  const [syncStatus, setSyncStatus] = useState<string>("idle");

  useEffect(() => {
    console.log("SyncShopify component mounted");

    async function syncShopifyOrders() {
      try {
        console.log("Starting Shopify order sync process...");
        setSyncStatus("syncing");

        const startTime = Date.now();
        const res = await fetch("/api/sync", { method: "POST" });
        const responseTime = Date.now() - startTime;
        console.log(`Received response from /api/sync in ${responseTime}ms`);

        if (!res.ok) {
          console.error(`Error syncing Shopify orders: ${res.status} ${res.statusText}`);
          const details = await res.text().catch(() => "No details");
          console.error("Response details:", details);
          setSyncStatus("error");
        } else {
          const data = await res.json().catch(() => ({}));
          console.log("Shopify orders synced successfully", data);
          setSyncStatus("success");

          // Dispatch an event to notify other components (if needed)
          const syncEvent = new Event(SHOPIFY_SYNC_COMPLETE_EVENT);
          window.dispatchEvent(syncEvent);
          console.log("Dispatched sync complete event");
        }
      } catch (error: any) {
        console.error("Sync error:", error);
        setSyncStatus("error");
      }
    }

    syncShopifyOrders();
  }, []);

  // Visual indicator for sync status (optional)
  if (syncStatus === "syncing") {
    return (
      <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-md text-sm">
        Syncing Shopify orders...
      </div>
    );
  }
  if (syncStatus === "success") {
    return (
      <div className="fixed bottom-4 right-4 bg-green-500 text-white px-3 py-1 rounded-md text-sm">
        Shopify sync complete
      </div>
    );
  }
  if (syncStatus === "error") {
    return (
      <div className="fixed bottom-4 right-4 bg-red-500 text-white px-3 py-1 rounded-md text-sm">
        Shopify sync failed
      </div>
    );
  }

  return null;
}