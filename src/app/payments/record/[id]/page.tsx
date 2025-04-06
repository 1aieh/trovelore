// src/app/payments/record/[id]/page.tsx
"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/ui/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { PaymentStatusIndicator } from "@/components/ui/payment-status-indicator"
import { IconArrowLeft, IconCreditCard } from "@tabler/icons-react"
import { fetchOrderById, upsertOrder } from "@/lib/supabaseClient"
import { Order } from "@/types"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"

export default function RecordPaymentPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string
  
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  // Payment form state
  const [paymentType, setPaymentType] = useState<string>("deposit")
  const [paymentAmount, setPaymentAmount] = useState<number>(0)
  const [paymentDate, setPaymentDate] = useState<Date>(new Date())
  const [paymentNotes, setPaymentNotes] = useState<string>("")
  
  useEffect(() => {
    loadOrderDetails()
  }, [orderId])
  
  const loadOrderDetails = async () => {
    setLoading(true)
    try {
      const orderData = await fetchOrderById(orderId)
      setOrder(orderData)
      
      // Set default payment amount based on what's due
      if (!orderData.payment_1 || orderData.payment_1 === 0) {
        // Deposit is due
        setPaymentType("deposit")
        setPaymentAmount(orderData.total_topay ? orderData.total_topay * 0.25 : 0)
      } else if (!orderData.payment_2 || orderData.payment_2 === 0) {
        // Final payment is due
        setPaymentType("final")
        setPaymentAmount(orderData.total_topay ? orderData.total_topay * 0.75 : 0)
      } else {
        // Additional payment
        setPaymentType("additional")
        setPaymentAmount(0)
      }
    } catch (error) {
      console.error("Error loading order details:", error)
    } finally {
      setLoading(false)
    }
  }
  
  // Calculate total paid amount
  const calculatePaidAmount = (): number => {
    if (!order) return 0
    let total = 0
    if (order.payment_1) total += Number(order.payment_1)
    if (order.payment_2) total += Number(order.payment_2)
    if (order.payment_3) total += Number(order.payment_3)
    if (order.payment_4) total += Number(order.payment_4)
    return total
  }
  
  // Calculate outstanding amount
  const calculateOutstanding = (): number => {
    if (!order) return 0
    const totalAmount = order.total_topay || 0
    const paidAmount = calculatePaidAmount()
    return totalAmount - paidAmount
  }
  
  // Handle payment type change
  const handlePaymentTypeChange = (type: string) => {
    setPaymentType(type)
    
    if (!order) return
    
    if (type === "deposit") {
      setPaymentAmount(order.total_topay ? order.total_topay * 0.25 : 0)
    } else if (type === "final") {
      setPaymentAmount(calculateOutstanding())
    } else {
      setPaymentAmount(0)
    }
  }
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!order) return
    
    setSubmitting(true)
    
    try {
      const updatedOrder = { ...order }
      
      // Update the appropriate payment field based on type
      if (paymentType === "deposit" || (!order.payment_1 || order.payment_1 === 0)) {
        updatedOrder.payment_1 = paymentAmount
        updatedOrder.date_p1 = paymentDate.toISOString()
      } else if (paymentType === "final" || (!order.payment_2 || order.payment_2 === 0)) {
        updatedOrder.payment_2 = paymentAmount
        updatedOrder.date_p2 = paymentDate.toISOString()
      } else if (!order.payment_3 || order.payment_3 === 0) {
        updatedOrder.payment_3 = paymentAmount
        updatedOrder.date_p3 = paymentDate.toISOString()
      } else {
        updatedOrder.payment_4 = paymentAmount
        updatedOrder.date_p4 = paymentDate.toISOString()
      }
      
      // Update payment status
      const newPaidAmount = calculatePaidAmount() + paymentAmount
      const totalAmount = order.total_topay || 0
      
      if (newPaidAmount >= totalAmount) {
        updatedOrder.payment_status = "Paid"
      } else if (newPaidAmount > 0) {
        if (paymentType === "deposit" || newPaidAmount <= totalAmount * 0.25) {
          updatedOrder.payment_status = "Deposit Paid"
        } else {
          updatedOrder.payment_status = "Partial Payment"
        }
      }
      
      // Save the updated order
      await upsertOrder(updatedOrder)
      
      // Redirect back to the order detail page
      router.push(`/orders/${orderId}?tab=payment`)
    } catch (error) {
      console.error("Error recording payment:", error)
      alert("Failed to record payment. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }
  
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p>Loading order details...</p>
        </div>
      </DashboardLayout>
    )
  }
  
  if (!order) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <p className="text-red-500">Order not found</p>
          <Button onClick={() => router.push("/payments")}>
            Back to Payments
          </Button>
        </div>
      </DashboardLayout>
    )
  }
  
  return (
    <DashboardLayout>
      <div className="px-4 md:px-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" asChild>
              <Link href={`/orders/${orderId}?tab=payment`}>
                <IconArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Record Payment</h1>
              <p className="text-muted-foreground">
                {order.order_ref || `Order #${order.id}`} - {order.buyer || 'Unknown Buyer'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payment-type">Payment Type</Label>
                <Select
                  value={paymentType}
                  onValueChange={handlePaymentTypeChange}
                >
                  <SelectTrigger id="payment-type">
                    <SelectValue placeholder="Select payment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deposit">25% Deposit</SelectItem>
                    <SelectItem value="final">Final Payment</SelectItem>
                    <SelectItem value="additional">Additional Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="payment-amount">Payment Amount</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="payment-date">Payment Date</Label>
                <DatePicker
                  date={paymentDate}
                  setDate={(date) => date && setPaymentDate(date)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="payment-notes">Notes (Optional)</Label>
                <Input
                  id="payment-notes"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Add any notes about this payment"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={handleSubmit}
                disabled={submitting || paymentAmount <= 0}
              >
                <IconCreditCard className="mr-2 h-4 w-4" />
                {submitting ? "Recording Payment..." : "Record Payment"}
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Payment Progress</h3>
                </div>
                <PaymentStatusIndicator
                  status={order.payment_status || ''}
                  totalAmount={order.total_topay || 0}
                  paidAmount={calculatePaidAmount()}
                />
              </div>
              
              <div className="rounded-md border p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order Total:</span>
                  <span className="font-medium">{formatCurrency(order.total_topay || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Paid:</span>
                  <span className="font-medium">{formatCurrency(calculatePaidAmount())}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-medium">Outstanding Balance:</span>
                  <span className="font-medium">{formatCurrency(calculateOutstanding())}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium">Payment History</h3>
                <div className="rounded-md border divide-y">
                  {order.payment_1 && order.payment_1 > 0 && (
                    <div className="p-3 flex justify-between">
                      <div>
                        <div className="font-medium">Deposit</div>
                        <div className="text-xs text-muted-foreground">
                          {order.date_p1 ? formatDate(order.date_p1.toString()) : 'Unknown date'}
                        </div>
                      </div>
                      <div className="font-medium">{formatCurrency(order.payment_1)}</div>
                    </div>
                  )}
                  
                  {order.payment_2 && order.payment_2 > 0 && (
                    <div className="p-3 flex justify-between">
                      <div>
                        <div className="font-medium">Second Payment</div>
                        <div className="text-xs text-muted-foreground">
                          {order.date_p2 ? formatDate(order.date_p2.toString()) : 'Unknown date'}
                        </div>
                      </div>
                      <div className="font-medium">{formatCurrency(order.payment_2)}</div>
                    </div>
                  )}
                  
                  {order.payment_3 && order.payment_3 > 0 && (
                    <div className="p-3 flex justify-between">
                      <div>
                        <div className="font-medium">Third Payment</div>
                        <div className="text-xs text-muted-foreground">
                          {order.date_p3 ? formatDate(order.date_p3.toString()) : 'Unknown date'}
                        </div>
                      </div>
                      <div className="font-medium">{formatCurrency(order.payment_3)}</div>
                    </div>
                  )}
                  
                  {order.payment_4 && order.payment_4 > 0 && (
                    <div className="p-3 flex justify-between">
                      <div>
                        <div className="font-medium">Fourth Payment</div>
                        <div className="text-xs text-muted-foreground">
                          {order.date_p4 ? formatDate(order.date_p4.toString()) : 'Unknown date'}
                        </div>
                      </div>
                      <div className="font-medium">{formatCurrency(order.payment_4)}</div>
                    </div>
                  )}
                  
                  {!order.payment_1 && !order.payment_2 && !order.payment_3 && !order.payment_4 && (
                    <div className="p-3 text-center text-muted-foreground">
                      No payments recorded yet
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
