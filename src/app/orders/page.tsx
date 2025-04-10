// src/app/orders/page.tsx
"use client";

import OrdersTable from "@/components/OrdersTable";
import SyncShopify from "@/components/SyncShopify";

export default function OrdersPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <div className="flex items-center gap-2">
          <SyncShopify />
        </div>
      </div>
      <OrdersTable data={[]} />
    </div>
  );
}
