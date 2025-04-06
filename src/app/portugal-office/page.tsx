// src/app/portugal-office/page.tsx
"use client"

import React, { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/ui/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatusBadge } from "@/components/ui/status-badge"
import { SummaryCard } from "@/components/ui/summary-card"
import { RoleGuard } from "@/components/role-guard"
import { ROLES } from "@/lib/auth"
import { IconBox, IconTruck, IconCreditCard, IconCalendarEvent } from "@tabler/icons-react"
import { fetchOrders } from "@/lib/supabaseClient"
import { Order } from "@/types"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"

export default function PortugalOfficePage() {
  return (
    <RoleGuard requiredRole={ROLES.PORTUGAL_OFFICE} fallback={<UnauthorizedView />}>
      <PortugalOfficeView />
    </RoleGuard>
  )
}

function UnauthorizedView() {
  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center h-full p-6">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Access Restricted</h1>
          <p className="text-muted-foreground mb-6">
            This view is only available to Portugal Office staff. Please contact your administrator if you believe you should have access.
          </p>
          <Button asChild>
            <Link href="/dashboard">Return to Dashboard</Link>
          </Button>
        </div>
      </div>
    </DashboardLayout>
  )
}

function PortugalOfficeView() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("incoming")
  
  // Stats for summary cards
  const [stats, setStats] = useState({
    incomingOrders: 0,
    pendingPayment: 0,
    readyToShip: 0,
    shipped: 0
  })
  
  useEffect(() => {
    loadOrders()
  }, [activeTab])
  
  const loadOrders = async () => {
    setLoading(true)
    try {
      // Prepare filters based on active tab
      const filters: Record<string, any> = {}
      
      if (activeTab === "incoming") {
        filters.ship_status = "In Production"
      } else if (activeTab === "pending-payment") {
        filters.payment_status = "Deposit Paid"
        filters.ship_status = "Ready to Ship"
      } else if (activeTab === "ready-to-ship") {
        filters.payment_status = "Paid"
        filters.ship_status = "Ready to Ship"
      } else if (activeTab === "shipped") {
        filters.ship_status = "Shipped"
      }
      
      const result = await fetchOrders({
        page: 1,
        pageSize: 50,
        filters
      })
      
      setOrders(result.data)
      
      // Calculate stats
      calculateStats(result.data)
    } catch (error) {
      console.error("Error loading orders:", error)
    } finally {
      setLoading(false)
    }
  }
  
  const calculateStats = (orderData: Order[]) => {
    let incomingOrders = 0
    let pendingPayment = 0
    let readyToShip = 0
    let shipped = 0
    
    orderData.forEach(order => {
      if (order.ship_status === "In Production") {
        incomingOrders += 1
      } else if (order.payment_status !== "Paid" && order.ship_status === "Ready to Ship") {
        pendingPayment += 1
      } else if (order.payment_status === "Paid" && order.ship_status === "Ready to Ship") {
        readyToShip += 1
      } else if (order.ship_status === "Shipped") {
        shipped += 1
      }
    })
    
    setStats({
      incomingOrders,
      pendingPayment,
      readyToShip,
      shipped
    })
  }
  
  return (
    <DashboardLayout>
      <div className="px-4 md:px-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Portugal Office</h1>
            <p className="text-muted-foreground">
              Manage incoming shipments and deliveries
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Incoming Orders"
            value={stats.incomingOrders}
            icon={<IconBox />}
            description="Orders in production"
          />
          <SummaryCard
            title="Pending Payment"
            value={stats.pendingPayment}
            icon={<IconCreditCard />}
            description="Awaiting final payment"
          />
          <SummaryCard
            title="Ready to Ship"
            value={stats.readyToShip}
            icon={<IconTruck />}
            description="Paid and ready to ship"
          />
          <SummaryCard
            title="Shipped"
            value={stats.shipped}
            icon={<IconCalendarEvent />}
            description="Orders shipped to customers"
          />
        </div>
        
        <Tabs defaultValue="incoming" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="incoming">Incoming Orders</TabsTrigger>
            <TabsTrigger value="pending-payment">Pending Payment</TabsTrigger>
            <TabsTrigger value="ready-to-ship">Ready to Ship</TabsTrigger>
            <TabsTrigger value="shipped">Shipped</TabsTrigger>
          </TabsList>
          
          <TabsContent value="incoming" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Orders in Production</CardTitle>
              </CardHeader>
              <CardContent>
                <OrdersList 
                  orders={orders} 
                  loading={loading}
                  showPaymentStatus={true}
                  showShippingStatus={true}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="pending-payment" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Orders Awaiting Final Payment</CardTitle>
              </CardHeader>
              <CardContent>
                <OrdersList 
                  orders={orders} 
                  loading={loading}
                  showPaymentStatus={true}
                  showShippingStatus={false}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="ready-to-ship" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Orders Ready to Ship</CardTitle>
              </CardHeader>
              <CardContent>
                <OrdersList 
                  orders={orders} 
                  loading={loading}
                  showPaymentStatus={false}
                  showShippingStatus={true}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="shipped" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Shipped Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <OrdersList 
                  orders={orders} 
                  loading={loading}
                  showPaymentStatus={false}
                  showShippingStatus={true}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

interface OrdersListProps {
  orders: Order[]
  loading: boolean
  showPaymentStatus: boolean
  showShippingStatus: boolean
}

function OrdersList({ 
  orders, 
  loading,
  showPaymentStatus,
  showShippingStatus
}: OrdersListProps) {
  if (loading) {
    return <div className="text-center py-8">Loading orders...</div>
  }
  
  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No orders found in this category
      </div>
    )
  }
  
  return (
    <div className="rounded-md border">
      <table className="min-w-full divide-y divide-border">
        <thead>
          <tr className="divide-x divide-border">
            <th className="px-4 py-3.5 text-left text-sm font-semibold">Order</th>
            <th className="px-4 py-3.5 text-left text-sm font-semibold">Buyer</th>
            <th className="px-4 py-3.5 text-left text-sm font-semibold">Delivery Address</th>
            <th className="px-4 py-3.5 text-right text-sm font-semibold">Total</th>
            {showPaymentStatus && (
              <th className="px-4 py-3.5 text-center text-sm font-semibold">Payment</th>
            )}
            {showShippingStatus && (
              <th className="px-4 py-3.5 text-center text-sm font-semibold">Shipping</th>
            )}
            <th className="px-4 py-3.5 text-center text-sm font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {orders.map((order) => (
            <tr key={order.id} className="divide-x divide-border">
              <td className="px-4 py-3 text-sm">
                <Link href={`/orders/${order.id}`} className="font-medium hover:underline">
                  {order.order_ref || `Order #${order.id}`}
                </Link>
                <div className="text-xs text-muted-foreground">
                  {formatDate(order.order_date?.toString() || order.created_at || '')}
                </div>
              </td>
              <td className="px-4 py-3 text-sm">
                {order.buyer || 'Unknown Buyer'}
              </td>
              <td className="px-4 py-3 text-sm">
                {order.city}, {order.country}
              </td>
              <td className="px-4 py-3 text-sm text-right font-medium">
                {formatCurrency(order.total_topay || 0)}
              </td>
              {showPaymentStatus && (
                <td className="px-4 py-3 text-sm text-center">
                  <StatusBadge status={order.payment_status || 'No Payment Received'} type="payment" />
                </td>
              )}
              {showShippingStatus && (
                <td className="px-4 py-3 text-sm text-center">
                  <StatusBadge status={order.ship_status || 'Processing'} type="shipping" />
                </td>
              )}
              <td className="px-4 py-3 text-sm">
                <div className="flex justify-center gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/orders/${order.id}`}>
                      View Details
                    </Link>
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
