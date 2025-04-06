// src/app/orders/new/page.tsx
"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/ui/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IconArrowLeft, IconPlus, IconTrash } from "@tabler/icons-react"
import { fetchBlocks, fetchBuyers, upsertOrder } from "@/lib/supabaseClient"
import { Order, Block, Buyer, OrderItem } from "@/types"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"

export default function NewOrderPage() {
  const router = useRouter()
  
  const [blocks, setBlocks] = useState<Block[]>([])
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("details")
  
  // Order form state
  const [order, setOrder] = useState<Partial<Order>>({
    order_date: new Date().toISOString(),
    source: "Manual",
    ship_status: "Not Shipped",
    payment_status: "No Payment Received",
    received: "No",
    products: "[]",
    total_qty: 0,
    value: 0,
    shipping: 0,
    total_amt: 0,
    vat_amt: 0,
    total_topay: 0,
  })
  
  // Products state (for the products table)
  const [products, setProducts] = useState<OrderItem[]>([])
  
  useEffect(() => {
    loadFormData()
  }, [])
  
  const loadFormData = async () => {
    setLoading(true)
    try {
      // Fetch blocks and buyers for dropdowns
      const blocksData = await fetchBlocks()
      const buyersData = await fetchBuyers()
      
      setBlocks(blocksData)
      setBuyers(buyersData)
    } catch (error) {
      console.error("Error loading form data:", error)
    } finally {
      setLoading(false)
    }
  }
  
  // Handle form field changes
  const handleChange = (field: keyof Order, value: any) => {
    setOrder(prev => ({ ...prev, [field]: value }))
  }
  
  // Handle buyer selection
  const handleBuyerSelect = (buyerId: string) => {
    const selectedBuyer = buyers.find(b => b.id.toString() === buyerId)
    if (selectedBuyer) {
      setOrder(prev => ({
        ...prev,
        buyer_id: selectedBuyer.id,
        buyer: selectedBuyer.name,
      }))
    }
  }
  
  // Handle block selection
  const handleBlockSelect = (blockId: string) => {
    setOrder(prev => ({
      ...prev,
      block_id: blockId ? parseInt(blockId) : null,
    }))
  }
  
  // Add a new product row
  const addProduct = () => {
    const newProduct: OrderItem = {
      id: Date.now().toString(),
      title: "",
      quantity: 1,
      price: "0",
      sku: "",
    }
    setProducts([...products, newProduct])
  }
  
  // Remove a product row
  const removeProduct = (productId: string) => {
    setProducts(products.filter(p => p.id.toString() !== productId))
  }
  
  // Update a product field
  const updateProduct = (productId: string, field: keyof OrderItem, value: any) => {
    setProducts(products.map(p => 
      p.id.toString() === productId ? { ...p, [field]: value } : p
    ))
  }
  
  // Calculate totals based on products
  useEffect(() => {
    const totalQty = products.reduce((sum, p) => sum + (parseInt(p.quantity.toString()) || 0), 0)
    const subtotal = products.reduce((sum, p) => sum + ((parseFloat(p.price) || 0) * (parseInt(p.quantity.toString()) || 0)), 0)
    const shipping = parseFloat(order.shipping?.toString() || "0")
    const vat = parseFloat(order.vat_amt?.toString() || "0")
    const total = subtotal + shipping + vat
    
    setOrder(prev => ({
      ...prev,
      total_qty: totalQty,
      value: subtotal,
      total_amt: total,
      total_topay: total,
      products: JSON.stringify(products),
      deposit_25: total * 0.25,
    }))
  }, [products, order.shipping, order.vat_amt])
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    
    try {
      // Generate order reference if not provided
      if (!order.order_ref) {
        const timestamp = new Date().getTime().toString().slice(-6)
        order.order_ref = `ORD-${timestamp}`
      }
      
      // Save the order
      const savedOrder = await upsertOrder(order)
      
      // Redirect to the order detail page
      router.push(`/orders/${savedOrder.id}`)
    } catch (error) {
      console.error("Error saving order:", error)
      alert("Failed to save order. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }
  
  // Navigate between tabs
  const goToNextTab = () => {
    if (activeTab === "details") setActiveTab("products")
    else if (activeTab === "products") setActiveTab("payment")
    else if (activeTab === "payment") setActiveTab("shipping")
  }
  
  const goToPrevTab = () => {
    if (activeTab === "shipping") setActiveTab("payment")
    else if (activeTab === "payment") setActiveTab("products")
    else if (activeTab === "products") setActiveTab("details")
  }
  
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p>Loading form data...</p>
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
              <h1 className="text-2xl font-bold tracking-tight">New Order</h1>
              <p className="text-muted-foreground">
                Create a new manual order
              </p>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="details">Order Details</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="payment">Payment</TabsTrigger>
              <TabsTrigger value="shipping">Shipping</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="order_ref">Order Reference</Label>
                      <Input
                        id="order_ref"
                        placeholder="Auto-generated if left empty"
                        value={order.order_ref || ""}
                        onChange={(e) => handleChange("order_ref", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="order_date">Order Date</Label>
                      <DatePicker
                        date={order.order_date ? new Date(order.order_date) : undefined}
                        setDate={(date) => handleChange("order_date", date?.toISOString())}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="buyer_id">Buyer</Label>
                    <Select
                      value={order.buyer_id?.toString() || ""}
                      onValueChange={handleBuyerSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a buyer" />
                      </SelectTrigger>
                      <SelectContent>
                        {buyers.map((buyer) => (
                          <SelectItem key={buyer.id} value={buyer.id.toString()}>
                            {buyer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="block_id">Block</Label>
                    <Select
                      value={order.block_id?.toString() || ""}
                      onValueChange={handleBlockSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a block (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {blocks.map((block) => (
                          <SelectItem key={block.id} value={block.id.toString()}>
                            {block.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button type="button" onClick={goToNextTab}>
                    Next: Products
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="products" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Products</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-md border">
                    <table className="min-w-full divide-y divide-border">
                      <thead>
                        <tr className="divide-x divide-border">
                          <th className="px-4 py-3.5 text-left text-sm font-semibold">Product</th>
                          <th className="px-4 py-3.5 text-right text-sm font-semibold w-24">Quantity</th>
                          <th className="px-4 py-3.5 text-right text-sm font-semibold w-32">Price</th>
                          <th className="px-4 py-3.5 text-right text-sm font-semibold w-32">Total</th>
                          <th className="px-4 py-3.5 text-center text-sm font-semibold w-16">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {products.map((product) => (
                          <tr key={product.id} className="divide-x divide-border">
                            <td className="px-4 py-3 text-sm">
                              <Input
                                value={product.title}
                                onChange={(e) => updateProduct(product.id.toString(), "title", e.target.value)}
                                placeholder="Product name"
                              />
                              <Input
                                className="mt-1"
                                value={product.sku}
                                onChange={(e) => updateProduct(product.id.toString(), "sku", e.target.value)}
                                placeholder="SKU (optional)"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              <Input
                                type="number"
                                min="1"
                                value={product.quantity}
                                onChange={(e) => updateProduct(product.id.toString(), "quantity", parseInt(e.target.value) || 1)}
                                className="text-right"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={product.price}
                                onChange={(e) => updateProduct(product.id.toString(), "price", e.target.value)}
                                className="text-right"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium">
                              {formatCurrency((parseFloat(product.price) || 0) * (parseInt(product.quantity.toString()) || 0))}
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeProduct(product.id.toString())}
                              >
                                <IconTrash className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                        {products.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                              No products added yet. Click "Add Product" to start.
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="divide-x divide-border">
                          <td colSpan={3} className="px-4 py-3 text-sm text-right font-medium">Subtotal</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(order.value || 0)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  
                  <Button type="button" variant="outline" onClick={addProduct}>
                    <IconPlus className="mr-2 h-4 w-4" />
                    Add Product
                  </Button>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button type="button" variant="outline" onClick={goToPrevTab}>
                    Back: Details
                  </Button>
                  <Button type="button" onClick={goToNextTab}>
                    Next: Payment
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="payment" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="shipping">Shipping Cost</Label>
                      <Input
                        id="shipping"
                        type="number"
                        min="0"
                        step="0.01"
                        value={order.shipping || 0}
                        onChange={(e) => handleChange("shipping", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vat_amt">VAT Amount</Label>
                      <Input
                        id="vat_amt"
                        type="number"
                        min="0"
                        step="0.01"
                        value={order.vat_amt || 0}
                        onChange={(e) => handleChange("vat_amt", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  
                  <div className="rounded-md border p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span>{formatCurrency(order.value || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Shipping:</span>
                        <span>{formatCurrency(order.shipping || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">VAT:</span>
                        <span>{formatCurrency(order.vat_amt || 0)}</span>
                      </div>
                      <div className="flex justify-between font-medium pt-2 border-t">
                        <span>Total:</span>
                        <span>{formatCurrency(order.total_topay || 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t">
                        <span className="text-muted-foreground">Required Deposit (25%):</span>
                        <span>{formatCurrency((order.total_topay || 0) * 0.25)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="payment_status">Payment Status</Label>
                    <Select
                      value={order.payment_status || "No Payment Received"}
                      onValueChange={(value) => handleChange("payment_status", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="No Payment Received">No Payment Received</SelectItem>
                        <SelectItem value="Deposit Paid">Deposit Paid</SelectItem>
                        <SelectItem value="Partial Payment">Partial Payment</SelectItem>
                        <SelectItem value="Paid">Fully Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {order.payment_status !== "No Payment Received" && (
                    <div className="space-y-4 border rounded-md p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="payment_1">Deposit Amount</Label>
                          <Input
                            id="payment_1"
                            type="number"
                            min="0"
                            step="0.01"
                            value={order.payment_1 || (order.total_topay || 0) * 0.25}
                            onChange={(e) => handleChange("payment_1", parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="date_p1">Deposit Date</Label>
                          <DatePicker
                            date={order.date_p1 ? new Date(order.date_p1) : new Date()}
                            setDate={(date) => handleChange("date_p1", date?.toISOString())}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button type="button" variant="outline" onClick={goToPrevTab}>
                    Back: Products
                  </Button>
                  <Button type="button" onClick={goToNextTab}>
                    Next: Shipping
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="shipping" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Shipping Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={order.city || ""}
                        onChange={(e) => handleChange("city", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zip_code">Zip/Postal Code</Label>
                      <Input
                        id="zip_code"
                        value={order.zip_code || ""}
                        onChange={(e) => handleChange("zip_code", e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={order.country || ""}
                        onChange={(e) => handleChange("country", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zone">Zone</Label>
                      <Input
                        id="zone"
                        value={order.zone || ""}
                        onChange={(e) => handleChange("zone", e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="ship_status">Shipping Status</Label>
                    <Select
                      value={order.ship_status || "Not Shipped"}
                      onValueChange={(value) => handleChange("ship_status", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select shipping status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Not Shipped">Not Shipped</SelectItem>
                        <SelectItem value="In Production">In Production</SelectItem>
                        <SelectItem value="Shipped">Shipped</SelectItem>
                        <SelectItem value="Delivered">Delivered</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {order.ship_status === "Shipped" && (
                    <div className="space-y-2">
                      <Label htmlFor="ship_date">Ship Date</Label>
                      <DatePicker
                        date={order.ship_date ? new Date(order.ship_date) : undefined}
                        setDate={(date) => handleChange("ship_date", date?.toISOString())}
                      />
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button type="button" variant="outline" onClick={goToPrevTab}>
                    Back: Payment
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Saving..." : "Create Order"}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </form>
      </div>
    </DashboardLayout>
  )
}
