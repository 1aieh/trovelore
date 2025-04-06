// src/app/orders/[id]/page.tsx
"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/ui/dashboard-layout"
import { StatusBadge } from "@/components/ui/status-badge"
import { PaymentStatusIndicator } from "@/components/ui/payment-status-indicator"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { 
  IconArrowLeft, 
  IconCalendarEvent, 
  IconCreditCard, 
  IconEdit, 
  IconMail, 
  IconPackage, 
  IconTruckDelivery, 
  IconUser 
} from "@tabler/icons-react"
import { fetchOrderById, fetchBlocks, fetchBuyers } from "@/lib/supabaseClient"
import { Order, Block, Buyer } from "@/types"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string
  
  const [order, setOrder] = useState<Order | null>(null)
  const [block, setBlock] = useState<Block | null>(null)
  const [buyer, setBuyer] = useState<Buyer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadOrderDetails()
  }, [orderId])

  const loadOrderDetails = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Fetch order details
      const orderData = await fetchOrderById(orderId)
      setOrder(orderData)
      
      // If order has a block_id, fetch block details
      if (orderData.block_id) {
        const blocks = await fetchBlocks()
        const matchingBlock = blocks.find(b => b.id === orderData.block_id)
        if (matchingBlock) {
          setBlock(matchingBlock)
        }
      }
      
      // If order has a buyer_id, fetch buyer details
      if (orderData.buyer_id) {
        const buyers = await fetchBuyers()
        const matchingBuyer = buyers.find(b => b.id === orderData.buyer_id)
        if (matchingBuyer) {
          setBuyer(matchingBuyer)
        }
      }
    } catch (error) {
      console.error("Error loading order details:", error)
      setError("Failed to load order details. Please try again.")
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

  // Parse products JSON
  const getProducts = (): any[] => {
    if (!order || !order.products) return []
    try {
      return typeof order.products === 'string' 
        ? JSON.parse(order.products) 
        : order.products
    } catch (e) {
      console.error("Error parsing products JSON:", e)
      return []
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

  if (error || !order) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <p className="text-red-500">{error || "Order not found"}</p>
          <Button onClick={() => router.push("/orders")}>
            Back to Orders
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
              <Link href="/orders">
                <IconArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {order.order_ref || `Order #${order.id}`}
              </h1>
              <p className="text-muted-foreground">
                {formatDate(order.order_date?.toString() || order.created_at || '')}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/orders/${orderId}/edit`}>
                <IconEdit className="mr-2 h-4 w-4" />
                Edit Order
              </Link>
            </Button>
            <Button variant="outline">
              <IconMail className="mr-2 h-4 w-4" />
              Send Email
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <IconUser className="h-4 w-4" />
                Buyer Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium">{order.buyer || "Unknown Buyer"}</div>
              {buyer && (
                <div className="mt-2 space-y-1 text-sm">
                  {buyer.email && <p>{buyer.email}</p>}
                  {buyer.billing_address && <p>{buyer.billing_address}</p>}
                  {buyer.delivery_contact && (
                    <p className="text-muted-foreground">
                      Contact: {buyer.delivery_contact}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <IconCalendarEvent className="h-4 w-4" />
                Block Assignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {block ? (
                <div>
                  <div className="text-lg font-medium">{block.name}</div>
                  <div className="mt-2 space-y-1 text-sm">
                    <p>Ship Month: {formatDate(block.ship_month?.toString() || '', { month: 'long', year: 'numeric' })}</p>
                    <p className="flex items-center gap-1">
                      Status: <StatusBadge status={block.ship_status || ''} type="block" />
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground">
                  Not assigned to any block
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <IconTruckDelivery className="h-4 w-4" />
                Shipping Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <StatusBadge status={order.ship_status || 'Not Shipped'} type="shipping" />
              </div>
              <div className="mt-2 space-y-1 text-sm">
                {order.ship_date && (
                  <p>Ship Date: {formatDate(order.ship_date.toString())}</p>
                )}
                {order.city && order.country && (
                  <p className="text-muted-foreground">
                    Destination: {order.city}, {order.country}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Order Details</TabsTrigger>
            <TabsTrigger value="payment">Payment</TabsTrigger>
            <TabsTrigger value="shipping">Shipping</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="min-w-full divide-y divide-border">
                    <thead>
                      <tr className="divide-x divide-border">
                        <th className="px-4 py-3.5 text-left text-sm font-semibold">Product</th>
                        <th className="px-4 py-3.5 text-right text-sm font-semibold">Quantity</th>
                        <th className="px-4 py-3.5 text-right text-sm font-semibold">Price</th>
                        <th className="px-4 py-3.5 text-right text-sm font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {getProducts().map((product, index) => (
                        <tr key={index} className="divide-x divide-border">
                          <td className="px-4 py-3 text-sm">
                            <div className="font-medium">{product.title || product.name}</div>
                            {product.sku && <div className="text-xs text-muted-foreground">SKU: {product.sku}</div>}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">{product.quantity}</td>
                          <td className="px-4 py-3 text-sm text-right">{formatCurrency(parseFloat(product.price))}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">
                            {formatCurrency(parseFloat(product.price) * parseInt(product.quantity))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="divide-x divide-border">
                        <td colSpan={3} className="px-4 py-3 text-sm text-right font-medium">Subtotal</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(order.value || 0)}</td>
                      </tr>
                      <tr className="divide-x divide-border">
                        <td colSpan={3} className="px-4 py-3 text-sm text-right font-medium">Shipping</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(order.shipping || 0)}</td>
                      </tr>
                      {order.vat_amt && order.vat_amt > 0 && (
                        <tr className="divide-x divide-border">
                          <td colSpan={3} className="px-4 py-3 text-sm text-right font-medium">VAT</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(order.vat_amt)}</td>
                        </tr>
                      )}
                      <tr className="divide-x divide-border bg-muted/50">
                        <td colSpan={3} className="px-4 py-3 text-sm text-right font-medium">Total</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(order.total_topay || 0)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Order Information</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div className="flex justify-between md:block">
                    <dt className="text-muted-foreground">Order ID</dt>
                    <dd className="font-medium md:mt-1">{order.id}</dd>
                  </div>
                  <div className="flex justify-between md:block">
                    <dt className="text-muted-foreground">Order Reference</dt>
                    <dd className="font-medium md:mt-1">{order.order_ref}</dd>
                  </div>
                  <div className="flex justify-between md:block">
                    <dt className="text-muted-foreground">Order Date</dt>
                    <dd className="font-medium md:mt-1">{formatDate(order.order_date?.toString() || order.created_at || '')}</dd>
                  </div>
                  <div className="flex justify-between md:block">
                    <dt className="text-muted-foreground">Source</dt>
                    <dd className="font-medium md:mt-1">{order.source || order.order_from || 'Manual'}</dd>
                  </div>
                  {order.shopify_id && (
                    <div className="flex justify-between md:block">
                      <dt className="text-muted-foreground">Shopify ID</dt>
                      <dd className="font-medium md:mt-1">{order.shopify_id}</dd>
                    </div>
                  )}
                  <div className="flex justify-between md:block">
                    <dt className="text-muted-foreground">Total Quantity</dt>
                    <dd className="font-medium md:mt-1">{order.total_qty || 0} items</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="payment" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">Payment Progress</h3>
                    <StatusBadge status={order.payment_status || 'No Payment Received'} type="payment" />
                  </div>
                  <PaymentStatusIndicator
                    status={order.payment_status || ''}
                    totalAmount={order.total_topay || 0}
                    paidAmount={calculatePaidAmount()}
                  />
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-medium mb-2">Payment Details</h3>
                  <div className="rounded-md border">
                    <table className="min-w-full divide-y divide-border">
                      <thead>
                        <tr className="divide-x divide-border">
                          <th className="px-4 py-3.5 text-left text-sm font-semibold">Type</th>
                          <th className="px-4 py-3.5 text-right text-sm font-semibold">Amount</th>
                          <th className="px-4 py-3.5 text-right text-sm font-semibold">Date</th>
                          <th className="px-4 py-3.5 text-right text-sm font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        <tr className="divide-x divide-border">
                          <td className="px-4 py-3 text-sm">
                            <div className="font-medium">25% Deposit</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {formatCurrency(order.deposit_25 || (order.total_topay ? order.total_topay * 0.25 : 0))}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {order.date_p1 ? formatDate(order.date_p1.toString()) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {order.payment_1 ? (
                              <span className="text-green-500 font-medium">Paid</span>
                            ) : (
                              <span className="text-red-500 font-medium">Pending</span>
                            )}
                          </td>
                        </tr>
                        <tr className="divide-x divide-border">
                          <td className="px-4 py-3 text-sm">
                            <div className="font-medium">Remaining Balance</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {formatCurrency(order.total_topay ? order.total_topay * 0.75 : 0)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {order.date_p2 ? formatDate(order.date_p2.toString()) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {order.payment_2 ? (
                              <span className="text-green-500 font-medium">Paid</span>
                            ) : (
                              <span className="text-red-500 font-medium">Pending</span>
                            )}
                          </td>
                        </tr>
                        {order.payment_3 && (
                          <tr className="divide-x divide-border">
                            <td className="px-4 py-3 text-sm">
                              <div className="font-medium">Additional Payment</div>
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              {formatCurrency(order.payment_3)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              {order.date_p3 ? formatDate(order.date_p3.toString()) : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              <span className="text-green-500 font-medium">Paid</span>
                            </td>
                          </tr>
                        )}
                        {order.payment_4 && (
                          <tr className="divide-x divide-border">
                            <td className="px-4 py-3 text-sm">
                              <div className="font-medium">Additional Payment</div>
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              {formatCurrency(order.payment_4)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              {order.date_p4 ? formatDate(order.date_p4.toString()) : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              <span className="text-green-500 font-medium">Paid</span>
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="divide-x divide-border bg-muted/50">
                          <td className="px-4 py-3 text-sm font-medium">Total Paid</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">
                            {formatCurrency(calculatePaidAmount())}
                          </td>
                          <td className="px-4 py-3 text-sm text-right"></td>
                          <td className="px-4 py-3 text-sm text-right font-medium">
                            {calculatePaidAmount() >= (order.total_topay || 0) ? (
                              <span className="text-green-500">Fully Paid</span>
                            ) : (
                              <span className="text-amber-500">Partially Paid</span>
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline">
                    <IconMail className="mr-2 h-4 w-4" />
                    Send Payment Reminder
                  </Button>
                  <Button>
                    <IconCreditCard className="mr-2 h-4 w-4" />
                    Record Payment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="shipping" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Shipping Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">Shipping Status</h3>
                    <StatusBadge status={order.ship_status || 'Not Shipped'} type="shipping" />
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-medium mb-2">Shipping Details</h3>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div className="flex justify-between md:block">
                      <dt className="text-muted-foreground">Ship Date</dt>
                      <dd className="font-medium md:mt-1">
                        {order.ship_date ? formatDate(order.ship_date.toString()) : 'Not shipped yet'}
                      </dd>
                    </div>
                    <div className="flex justify-between md:block">
                      <dt className="text-muted-foreground">Received</dt>
                      <dd className="font-medium md:mt-1">{order.received || 'No'}</dd>
                    </div>
                    <div className="flex justify-between md:block">
                      <dt className="text-muted-foreground">Destination</dt>
                      <dd className="font-medium md:mt-1">
                        {order.city && order.country ? `${order.city}, ${order.country}` : 'Not specified'}
                      </dd>
                    </div>
                    {order.zip_code && (
                      <div className="flex justify-between md:block">
                        <dt className="text-muted-foreground">Zip/Postal Code</dt>
                        <dd className="font-medium md:mt-1">{order.zip_code}</dd>
                      </div>
                    )}
                    {order.zone && (
                      <div className="flex justify-between md:block">
                        <dt className="text-muted-foreground">Zone</dt>
                        <dd className="font-medium md:mt-1">{order.zone}</dd>
                      </div>
                    )}
                  </dl>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-medium mb-2">Shipping Timeline</h3>
                  <div className="relative">
                    <div className="absolute left-3 top-0 bottom-0 w-px bg-border"></div>
                    <ul className="space-y-4">
                      <li className="relative pl-8">
                        <div className="absolute left-0 top-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                          <IconPackage className="h-3 w-3 text-primary-foreground" />
                        </div>
                        <div className="text-sm">
                          <div className="font-medium">Order Created</div>
                          <div className="text-muted-foreground">
                            {formatDate(order.created_at || '')}
                          </div>
                        </div>
                      </li>
                      {order.block_id && (
                        <li className="relative pl-8">
                          <div className="absolute left-0 top-1 h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                            <IconCalendarEvent className="h-3 w-3 text-primary" />
                          </div>
                          <div className="text-sm">
                            <div className="font-medium">Assigned to Block</div>
                            <div className="text-muted-foreground">
                              {block?.name || `Block #${order.block_id}`}
                            </div>
                          </div>
                        </li>
                      )}
                      {order.ship_status === 'In Production' && (
                        <li className="relative pl-8">
                          <div className="absolute left-0 top-1 h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                            <IconPackage className="h-3 w-3 text-primary" />
                          </div>
                          <div className="text-sm">
                            <div className="font-medium">In Production</div>
                            <div className="text-muted-foreground">
                              Order is being prepared
                            </div>
                          </div>
                        </li>
                      )}
                      {order.ship_status === 'Shipped' && order.ship_date && (
                        <li className="relative pl-8">
                          <div className="absolute left-0 top-1 h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                            <IconTruckDelivery className="h-3 w-3 text-primary" />
                          </div>
                          <div className="text-sm">
                            <div className="font-medium">Shipped</div>
                            <div className="text-muted-foreground">
                              {formatDate(order.ship_date.toString())}
                            </div>
                          </div>
                        </li>
                      )}
                      {order.received === 'Yes' && (
                        <li className="relative pl-8">
                          <div className="absolute left-0 top-1 h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                            <IconPackage className="h-3 w-3 text-white" />
                          </div>
                          <div className="text-sm">
                            <div className="font-medium">Delivered</div>
                            <div className="text-muted-foreground">
                              Order received by customer
                            </div>
                          </div>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline">
                    <IconMail className="mr-2 h-4 w-4" />
                    Send Shipping Update
                  </Button>
                  <Button>
                    <IconTruckDelivery className="mr-2 h-4 w-4" />
                    Update Shipping Status
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
