// src/app/orders/page.tsx
"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { DashboardLayout } from "@/components/ui/dashboard-layout"
import { OrderCard } from "@/components/ui/order-card"
import { OrderFilter, OrderFilters } from "@/components/ui/order-filter"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SummaryCard } from "@/components/ui/summary-card"
import { IconPlus, IconFileInvoice, IconCreditCard, IconTruckDelivery, IconPackage } from "@tabler/icons-react"
import { fetchOrders } from "@/lib/supabaseClient"
import { Order } from "@/types"

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<OrderFilters>({})
  const [activeTab, setActiveTab] = useState("all")

  // Stats for summary cards
  const [stats, setStats] = useState({
    total: 0,
    pendingPayment: 0,
    inProduction: 0,
    shipped: 0
  })

  useEffect(() => {
    loadOrders()
  }, [filters, activeTab])

  const loadOrders = async () => {
    setLoading(true)
    try {
      // Prepare filters based on active tab and user filters
      const combinedFilters: Record<string, any> = { ...filters }
      
      if (activeTab === "pending-payment") {
        combinedFilters.payment_status = "No Payment Received"
      } else if (activeTab === "in-production") {
        combinedFilters.ship_status = "In Production"
      } else if (activeTab === "shipped") {
        combinedFilters.ship_status = "Shipped"
      }

      const result = await fetchOrders({
        page: 1,
        pageSize: 20,
        filters: combinedFilters
      })

      setOrders(result.data)
      
      // Calculate stats
      const allOrders = result.data
      setStats({
        total: allOrders.length,
        pendingPayment: allOrders.filter(o => o.payment_status === "No Payment Received").length,
        inProduction: allOrders.filter(o => o.ship_status === "In Production").length,
        shipped: allOrders.filter(o => o.ship_status === "Shipped").length
      })
    } catch (error) {
      console.error("Error loading orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (newFilters: OrderFilters) => {
    setFilters(newFilters)
  }

  return (
    <DashboardLayout>
      <div className="px-4 md:px-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
            <p className="text-muted-foreground">
              Manage your orders, track payments, and monitor shipping status
            </p>
          </div>
          <Button asChild>
            <Link href="/orders/new">
              <IconPlus className="mr-2 h-4 w-4" />
              New Order
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Total Orders"
            value={stats.total}
            icon={<IconFileInvoice />}
            description="All orders in the system"
          />
          <SummaryCard
            title="Pending Payment"
            value={stats.pendingPayment}
            icon={<IconCreditCard />}
            description="Orders awaiting deposit"
          />
          <SummaryCard
            title="In Production"
            value={stats.inProduction}
            icon={<IconPackage />}
            description="Orders currently in production"
          />
          <SummaryCard
            title="Shipped"
            value={stats.shipped}
            icon={<IconTruckDelivery />}
            description="Orders shipped to customers"
          />
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="all">All Orders</TabsTrigger>
              <TabsTrigger value="pending-payment">Pending Payment</TabsTrigger>
              <TabsTrigger value="in-production">In Production</TabsTrigger>
              <TabsTrigger value="shipped">Shipped</TabsTrigger>
            </TabsList>
          </div>
          
          <div className="mt-4">
            <OrderFilter onFilterChange={handleFilterChange} />
          </div>

          <TabsContent value="all" className="mt-4">
            <OrdersList orders={orders} loading={loading} />
          </TabsContent>
          
          <TabsContent value="pending-payment" className="mt-4">
            <OrdersList orders={orders} loading={loading} />
          </TabsContent>
          
          <TabsContent value="in-production" className="mt-4">
            <OrdersList orders={orders} loading={loading} />
          </TabsContent>
          
          <TabsContent value="shipped" className="mt-4">
            <OrdersList orders={orders} loading={loading} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

function OrdersList({ orders, loading }: { orders: Order[], loading: boolean }) {
  if (loading) {
    return <div className="text-center py-8">Loading orders...</div>
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No orders found matching your criteria
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          id={order.id!}
          orderRef={order.order_ref || `Order #${order.id}`}
          orderDate={order.order_date?.toString() || order.created_at || ''}
          buyer={order.buyer || 'Unknown Buyer'}
          paymentStatus={order.payment_status || 'Unknown'}
          shipStatus={order.ship_status || 'Not Shipped'}
          totalAmount={order.total_topay || 0}
          paidAmount={calculatePaidAmount(order)}
          blockName={order.block_id ? `Block #${order.block_id}` : undefined}
        />
      ))}
    </div>
  )
}

// Helper function to calculate total paid amount from payment fields
function calculatePaidAmount(order: Order): number {
  let total = 0
  if (order.payment_1) total += Number(order.payment_1)
  if (order.payment_2) total += Number(order.payment_2)
  if (order.payment_3) total += Number(order.payment_3)
  if (order.payment_4) total += Number(order.payment_4)
  return total
}
