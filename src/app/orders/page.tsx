// src/app/orders/page.tsx
"use client";

import { useState, useEffect } from "react";
import OrdersTable from "@/components/OrdersTable";
import SyncShopify from "@/components/SyncShopify";
import { SHOPIFY_SYNC_COMPLETE_EVENT } from "@/components/SyncShopify";

export default function OrdersPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handleSync = () => {
      console.log("OrdersPage: Sync complete, refreshing table...");
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener(SHOPIFY_SYNC_COMPLETE_EVENT, handleSync);
    return () => window.removeEventListener(SHOPIFY_SYNC_COMPLETE_EVENT, handleSync);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <div className="flex items-center gap-2">
          <SyncShopify />
        </div>
      </div>
      <OrdersTable key={refreshKey} data={[]} />
    </div>
  );
}
