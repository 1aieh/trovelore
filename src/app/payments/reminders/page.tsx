// src/app/payments/reminders/page.tsx
"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/ui/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatusBadge } from "@/components/ui/status-badge"
import { IconArrowLeft, IconMail } from "@tabler/icons-react"
import { fetchOrders, sendPaymentReminders } from "@/lib/supabaseClient"
import { Order } from "@/types"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"

export default function PaymentRemindersPage() {
  const router = useRouter()
  
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [activeTab, setActiveTab] = useState("deposit")
  const [selectedOrders, setSelectedOrders] = useState<Record<string, boolean>>({})
  const [remindersSent, setRemindersSent] = useState(false)
  
  useEffect(() => {
    loadOrders()
  }, [activeTab])
  
  const loadOrders = async () => {
    setLoading(true)
    try {
      // Prepare filters based on active tab
      const filters: Record<string, any> = {}
      
      if (activeTab === "deposit") {
        filters.payment_status = "No Payment Received"
      } else if (activeTab === "final") {
        filters.payment_status = "Deposit Paid"
      }
      
      const result = await fetchOrders({
        page: 1,
        pageSize: 50,
        filters
      })
      
      setOrders(result.data)
      
      // Reset selected orders
      setSelectedOrders({})
    } catch (error) {
      console.error("Error loading orders:", error)
    } finally {
      setLoading(false)
    }
  }
  
  // Calculate total paid amount
  const calculatePaidAmount = (order: Order): number => {
    let total = 0
    if (order.payment_1) total += Number(order.payment_1)
    if (order.payment_2) total += Number(order.payment_2)
    if (order.payment_3) total += Number(order.payment_3)
    if (order.payment_4) total += Number(order.payment_4)
    return total
  }
  
  // Calculate outstanding amount
  const calculateOutstanding = (order: Order): number => {
    const totalAmount = order.total_topay || 0
    const paidAmount = calculatePaidAmount(order)
    return totalAmount - paidAmount
  }
  
  // Get next payment due
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
  
  // Toggle order selection
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }))
  }
  
  // Toggle all orders
  const toggleAllOrders = (checked: boolean) => {
    const newSelection: Record<string, boolean> = {}
    
    orders.forEach(order => {
      newSelection[order.id!.toString()] = checked
    })
    
    setSelectedOrders(newSelection)
  }
  
  // Get selected order count
  const getSelectedCount = (): number => {
    return Object.values(selectedOrders).filter(Boolean).length
  }
  
  // Get selected order IDs
  const getSelectedOrderIds = (): number[] => {
    return Object.entries(selectedOrders)
      .filter(([_, selected]) => selected)
      .map(([id, _]) => parseInt(id))
  }
  
  // Send payment reminders
  const sendReminders = async () => {
    const selectedIds = getSelectedOrderIds()
    
    if (selectedIds.length === 0) {
      alert("Please select at least one order to send reminders")
      return
    }
    
    setSending(true)
    
    try {
      await sendPaymentReminders({
        orderIds: selectedIds,
        reminderType: activeTab === "deposit" ? "deposit" : "final"
      })
      
      setRemindersSent(true)
      setSelectedOrders({})
    } catch (error) {
      console.error("Error sending payment reminders:", error)
      alert("Failed to send payment reminders. Please try again.")
    } finally {
      setSending(false)
    }
  }
  
  return (
    <DashboardLayout>
      <div className="px-4 md:px-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" asChild>
              <Link href="/payments">
                <IconArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Payment Reminders</h1>
              <p className="text-muted-foreground">
                Send payment reminders to customers
              </p>
            </div>
          </div>
        </div>
        
        {remindersSent ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="mb-4 text-green-500 flex justify-center">
                <IconMail className="h-12 w-12" />
              </div>
              <h2 className="text-xl font-bold mb-2">Payment Reminders Sent!</h2>
              <p className="text-muted-foreground mb-4">
                Payment reminders have been sent to the selected orders.
              </p>
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={() => setRemindersSent(false)}>
                  Send More Reminders
                </Button>
                <Button asChild>
                  <Link href="/payments">
                    Return to Payments
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Tabs defaultValue="deposit" value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="deposit">Deposit Reminders</TabsTrigger>
                <TabsTrigger value="final">Final Payment Reminders</TabsTrigger>
              </TabsList>
              
              <TabsContent value="deposit" className="mt-4 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Orders Awaiting Deposit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      These orders have not received the initial 25% deposit. Send reminders to request deposit payment.
                    </p>
                    <RemindersList
                      orders={orders}
                      loading={loading}
                      selectedOrders={selectedOrders}
                      toggleOrderSelection={toggleOrderSelection}
                      toggleAllOrders={toggleAllOrders}
                      calculatePaidAmount={calculatePaidAmount}
                      calculateOutstanding={calculateOutstanding}
                      getNextPaymentDue={getNextPaymentDue}
                    />
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <div>
                      <span className="text-sm text-muted-foreground">
                        {getSelectedCount()} orders selected
                      </span>
                    </div>
                    <Button 
                      onClick={sendReminders}
                      disabled={sending || getSelectedCount() === 0}
                    >
                      <IconMail className="mr-2 h-4 w-4" />
                      {sending ? "Sending..." : "Send Deposit Reminders"}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
              
              <TabsContent value="final" className="mt-4 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Orders Awaiting Final Payment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      These orders have received the initial 25% deposit but are awaiting final payment. Send reminders to request the remaining balance.
                    </p>
                    <RemindersList
                      orders={orders}
                      loading={loading}
                      selectedOrders={selectedOrders}
                      toggleOrderSelection={toggleOrderSelection}
                      toggleAllOrders={toggleAllOrders}
                      calculatePaidAmount={calculatePaidAmount}
                      calculateOutstanding={calculateOutstanding}
                      getNextPaymentDue={getNextPaymentDue}
                    />
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <div>
                      <span className="text-sm text-muted-foreground">
                        {getSelectedCount()} orders selected
                      </span>
                    </div>
                    <Button 
                      onClick={sendReminders}
                      disabled={sending || getSelectedCount() === 0}
                    >
                      <IconMail className="mr-2 h-4 w-4" />
                      {sending ? "Sending..." : "Send Final Payment Reminders"}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

interface RemindersListProps {
  orders: Order[]
  loading: boolean
  selectedOrders: Record<string, boolean>
  toggleOrderSelection: (orderId: string) => void
  toggleAllOrders: (checked: boolean) => void
  calculatePaidAmount: (order: Order) => number
  calculateOutstanding: (order: Order) => number
  getNextPaymentDue: (order: Order) => number
}

function RemindersList({
  orders,
  loading,
  selectedOrders,
  toggleOrderSelection,
  toggleAllOrders,
  calculatePaidAmount,
  calculateOutstanding,
  getNextPaymentDue
}: RemindersListProps) {
  if (loading) {
    return <div className="text-center py-8">Loading orders...</div>
  }
  
  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No orders found requiring payment reminders
      </div>
    )
  }
  
  return (
    <div className="rounded-md border">
      <table className="min-w-full divide-y divide-border">
        <thead>
          <tr className="divide-x divide-border">
            <th className="px-4 py-3.5 text-left text-sm font-semibold w-12">
              <Checkbox
                checked={orders.length > 0 && orders.every(order => selectedOrders[order.id!.toString()])}
                onCheckedChange={toggleAllOrders}
              />
            </th>
            <th className="px-4 py-3.5 text-left text-sm font-semibold">Order</th>
            <th className="px-4 py-3.5 text-left text-sm font-semibold">Buyer</th>
            <th className="px-4 py-3.5 text-right text-sm font-semibold">Total</th>
            <th className="px-4 py-3.5 text-right text-sm font-semibold">Paid</th>
            <th className="px-4 py-3.5 text-right text-sm font-semibold">Due</th>
            <th className="px-4 py-3.5 text-center text-sm font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {orders.map((order) => (
            <tr key={order.id} className="divide-x divide-border">
              <td className="px-4 py-3 text-sm">
                <Checkbox
                  checked={selectedOrders[order.id!.toString()]}
                  onCheckedChange={() => toggleOrderSelection(order.id!.toString())}
                />
              </td>
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
              </td>
              <td className="px-4 py-3 text-sm text-right font-medium">
                {formatCurrency(getNextPaymentDue(order))}
              </td>
              <td className="px-4 py-3 text-sm text-center">
                <StatusBadge status={order.payment_status || 'No Payment Received'} type="payment" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
