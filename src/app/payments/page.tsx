// src/app/payments/page.tsx
"use client"

import React, { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/ui/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { SummaryCard } from "@/components/ui/summary-card"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  IconCalendarEvent, 
  IconCreditCard, 
  IconCurrencyDollar, 
  IconMail, 
  IconSearch 
} from "@tabler/icons-react"
import { fetchOrders } from "@/lib/supabaseClient"
import { Order } from "@/types"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"

export default function PaymentsPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)

  // Stats for summary cards
  const [stats, setStats] = useState({
    totalOutstanding: 0,
    pendingDeposits: 0,
    pendingFinalPayments: 0,
    fullyPaid: 0
  })

  useEffect(() => {
    loadOrders()
  }, [activeTab, searchQuery, dateFrom, dateTo])

  const loadOrders = async () => {
    setLoading(true)
    try {
      // Prepare filters based on active tab and search
      const filters: Record<string, any> = {}
      
      if (searchQuery) {
        filters.search = searchQuery
      }
      
      if (dateFrom) {
        filters.dateFrom = dateFrom.toISOString()
      }
      
      if (dateTo) {
        filters.dateTo = dateTo.toISOString()
      }
      
      if (activeTab === "pending-deposit") {
        filters.payment_status = "No Payment Received"
      } else if (activeTab === "deposit-paid") {
        filters.payment_status = "Deposit Paid"
      } else if (activeTab === "fully-paid") {
        filters.payment_status = "Paid"
      }

      const result = await fetchOrders({
        page: 1,
        pageSize: 50,
        filters
      })

      setOrders(result.data)
      
      // Calculate payment stats
      calculatePaymentStats(result.data)
    } catch (error) {
      console.error("Error loading orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const calculatePaymentStats = (orderData: Order[]) => {
    let totalOutstanding = 0
    let pendingDeposits = 0
    let pendingFinalPayments = 0
    let fullyPaid = 0

    orderData.forEach(order => {
      const totalAmount = order.total_topay || 0
      const paidAmount = calculatePaidAmount(order)
      const outstanding = totalAmount - paidAmount
      
      if (outstanding > 0) {
        totalOutstanding += outstanding
        
        if (paidAmount === 0) {
          pendingDeposits += 1
        } else {
          pendingFinalPayments += 1
        }
      } else {
        fullyPaid += 1
      }
    })

    setStats({
      totalOutstanding,
      pendingDeposits,
      pendingFinalPayments,
      fullyPaid
    })
  }

  // Helper function to calculate total paid amount from payment fields
  const calculatePaidAmount = (order: Order): number => {
    let total = 0
    if (order.payment_1) total += Number(order.payment_1)
    if (order.payment_2) total += Number(order.payment_2)
    if (order.payment_3) total += Number(order.payment_3)
    if (order.payment_4) total += Number(order.payment_4)
    return total
  }

  // Helper function to calculate outstanding amount
  const calculateOutstanding = (order: Order): number => {
    const totalAmount = order.total_topay || 0
    const paidAmount = calculatePaidAmount(order)
    return totalAmount - paidAmount
  }

  // Helper function to determine if deposit is paid
  const isDepositPaid = (order: Order): boolean => {
    return !!order.payment_1 && Number(order.payment_1) > 0
  }

  // Helper function to determine if fully paid
  const isFullyPaid = (order: Order): boolean => {
    const totalAmount = order.total_topay || 0
    const paidAmount = calculatePaidAmount(order)
    return paidAmount >= totalAmount
  }

  // Helper function to get next payment due
  const getNextPaymentDue = (order: Order): number => {
    const totalAmount = order.total_topay || 0
    const paidAmount = calculatePaidAmount(order)
    
    if (paidAmount === 0) {
      // Deposit is due
      return totalAmount * 0.25
    } else if (paidAmount < totalAmount) {
      // Remaining balance is due
      return totalAmount - paidAmount
    }
    
    return 0
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadOrders()
  }

  const clearFilters = () => {
    setSearchQuery("")
    setDateFrom(undefined)
    setDateTo(undefined)
    setActiveTab("all")
  }

  return (
    <DashboardLayout>
      <div className="px-4 md:px-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Payment Tracking</h1>
            <p className="text-muted-foreground">
              Monitor payments, send reminders, and track deposits
            </p>
          </div>
          <Button asChild>
            <Link href="/payments/reminders">
              <IconMail className="mr-2 h-4 w-4" />
              Send Payment Reminders
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Outstanding Payments"
            value={formatCurrency(stats.totalOutstanding)}
            icon={<IconCurrencyDollar />}
            description="Total amount pending payment"
          />
          <SummaryCard
            title="Pending Deposits"
            value={stats.pendingDeposits}
            icon={<IconCreditCard />}
            description="Orders awaiting 25% deposit"
          />
          <SummaryCard
            title="Awaiting Final Payment"
            value={stats.pendingFinalPayments}
            icon={<IconCalendarEvent />}
            description="Orders with deposit paid"
          />
          <SummaryCard
            title="Fully Paid Orders"
            value={stats.fullyPaid}
            icon={<IconCreditCard />}
            description="Orders with all payments received"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payment Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <IconSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by order ref or buyer..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="date-from" className="sr-only">From Date</Label>
                    <DatePicker
                      date={dateFrom}
                      setDate={setDateFrom}
                      placeholder="From date"
                    />
                  </div>
                  <div>
                    <Label htmlFor="date-to" className="sr-only">To Date</Label>
                    <DatePicker
                      date={dateTo}
                      setDate={setDateTo}
                      placeholder="To date"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit">Apply Filters</Button>
                  <Button type="button" variant="outline" onClick={clearFilters}>
                    Clear
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Payments</TabsTrigger>
            <TabsTrigger value="pending-deposit">Pending Deposit</TabsTrigger>
            <TabsTrigger value="deposit-paid">Deposit Paid</TabsTrigger>
            <TabsTrigger value="fully-paid">Fully Paid</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-4">
            <PaymentsList 
              orders={orders} 
              loading={loading} 
              calculatePaidAmount={calculatePaidAmount}
              calculateOutstanding={calculateOutstanding}
              isDepositPaid={isDepositPaid}
              isFullyPaid={isFullyPaid}
              getNextPaymentDue={getNextPaymentDue}
            />
          </TabsContent>
          
          <TabsContent value="pending-deposit" className="mt-4">
            <PaymentsList 
              orders={orders} 
              loading={loading} 
              calculatePaidAmount={calculatePaidAmount}
              calculateOutstanding={calculateOutstanding}
              isDepositPaid={isDepositPaid}
              isFullyPaid={isFullyPaid}
              getNextPaymentDue={getNextPaymentDue}
            />
          </TabsContent>
          
          <TabsContent value="deposit-paid" className="mt-4">
            <PaymentsList 
              orders={orders} 
              loading={loading} 
              calculatePaidAmount={calculatePaidAmount}
              calculateOutstanding={calculateOutstanding}
              isDepositPaid={isDepositPaid}
              isFullyPaid={isFullyPaid}
              getNextPaymentDue={getNextPaymentDue}
            />
          </TabsContent>
          
          <TabsContent value="fully-paid" className="mt-4">
            <PaymentsList 
              orders={orders} 
              loading={loading} 
              calculatePaidAmount={calculatePaidAmount}
              calculateOutstanding={calculateOutstanding}
              isDepositPaid={isDepositPaid}
              isFullyPaid={isFullyPaid}
              getNextPaymentDue={getNextPaymentDue}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

interface PaymentsListProps {
  orders: Order[]
  loading: boolean
  calculatePaidAmount: (order: Order) => number
  calculateOutstanding: (order: Order) => number
  isDepositPaid: (order: Order) => boolean
  isFullyPaid: (order: Order) => boolean
  getNextPaymentDue: (order: Order) => number
}

function PaymentsList({ 
  orders, 
  loading,
  calculatePaidAmount,
  calculateOutstanding,
  isDepositPaid,
  isFullyPaid,
  getNextPaymentDue
}: PaymentsListProps) {
  if (loading) {
    return <div className="text-center py-8">Loading payment data...</div>
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No orders found matching your criteria
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
            <th className="px-4 py-3.5 text-right text-sm font-semibold">Total Amount</th>
            <th className="px-4 py-3.5 text-right text-sm font-semibold">Paid</th>
            <th className="px-4 py-3.5 text-right text-sm font-semibold">Outstanding</th>
            <th className="px-4 py-3.5 text-center text-sm font-semibold">Status</th>
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
              <td className="px-4 py-3 text-sm text-right font-medium">
                {formatCurrency(order.total_topay || 0)}
              </td>
              <td className="px-4 py-3 text-sm text-right">
                {formatCurrency(calculatePaidAmount(order))}
                {isDepositPaid(order) && !isFullyPaid(order) && (
                  <div className="text-xs text-amber-500">Deposit paid</div>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-right">
                {formatCurrency(calculateOutstanding(order))}
                {!isDepositPaid(order) && (
                  <div className="text-xs text-amber-500">
                    Deposit due: {formatCurrency((order.total_topay || 0) * 0.25)}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-center">
                <StatusBadge status={order.payment_status || 'No Payment Received'} type="payment" />
              </td>
              <td className="px-4 py-3 text-sm">
                <div className="flex justify-center gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/orders/${order.id}?tab=payment`}>
                      <IconCreditCard className="h-4 w-4 mr-1" />
                      Record
                    </Link>
                  </Button>
                  {!isFullyPaid(order) && (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/payments/remind/${order.id}`}>
                        <IconMail className="h-4 w-4 mr-1" />
                        Remind
                      </Link>
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
