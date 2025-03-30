"use client";

import { useEffect, useState } from "react";

// Define the custom event name (must match the one in OrdersTable)
const SHOPIFY_SYNC_COMPLETE_EVENT = "shopify-sync-complete";

export default function SyncShopify() {
  const [syncStatus, setSyncStatus] = useState<string>("idle");
  
  useEffect(() => {
    console.log("SyncShopify component mounted");
    
    async function syncShopifyOrders() {
      try {
        console.log("Starting Shopify order sync process...");
        setSyncStatus("syncing");
        
        console.log("Sending request to /api/sync endpoint...");
        const startTime = Date.now();
        const res = await fetch("/api/sync", { method: "POST" });
        const responseTime = Date.now() - startTime;
        console.log(`Received response from /api/sync in ${responseTime}ms`);
        
        if (!res.ok) {
          console.error(`Error syncing Shopify orders: ${res.status} ${res.statusText}`);
          console.error("Response details:", await res.text().catch(() => "Could not read response text"));
          setSyncStatus("error");
        } else {
          const data = await res.json().catch(() => ({}));
          console.log("Shopify orders synced successfully", data);
          console.log("Response status:", res.status);
          setSyncStatus("success");
          
          // Dispatch custom event to notify OrdersTable to refresh
          const syncEvent = new Event(SHOPIFY_SYNC_COMPLETE_EVENT);
          window.dispatchEvent(syncEvent);
          console.log("Dispatched sync complete event to trigger table refresh");
        }
      } catch (error) {
        console.error("Sync error:", error);
        console.error("Error details:", {
          name: error instanceof Error ? error.name : "Unknown",
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : "No stack trace"
        });
        setSyncStatus("error");
      }
    }
    
    syncShopifyOrders();
    
    return () => {
      console.log("SyncShopify component unmounting");
    };
  }, []);

  // Add a small visual indicator based on sync status
  if (syncStatus === "syncing") {
    return <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-md text-sm">Syncing Shopify orders...</div>;
  }
  
  if (syncStatus === "success") {
    return <div className="fixed bottom-4 right-4 bg-green-500 text-white px-3 py-1 rounded-md text-sm">Shopify sync complete</div>;
  }
  
  if (syncStatus === "error") {
    return <div className="fixed bottom-4 right-4 bg-red-500 text-white px-3 py-1 rounded-md text-sm">Shopify sync failed</div>;
  }
  
  return null;
}