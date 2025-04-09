// src/app/orders/page.tsx
"use client";

import OrdersTable from "@/components/OrdersTable"; // We'll update this import path after renaming
import SyncShopify from "@/components/SyncShopify";

export default function OrdersPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Orders</h1>
      {/* Moved from layout.tsx */}
      <SyncShopify />
      <OrdersTable data={[]} />
    </div>
  );
}
