// src/app/emails/send/[id]/page.tsx
"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/ui/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { IconArrowLeft, IconMail } from "@tabler/icons-react"
import { 
  getEmailTemplate, 
  EmailTemplateType, 
  sendCustomEmail, 
  sendDepositReminder,
  sendFinalPaymentReminder,
  sendDepositConfirmation,
  sendShippingNotification,
  getEmailLogsForOrder
} from "@/lib/email-service"
import { fetchOrderById, fetchBuyerById } from "@/lib/supabaseClient"
import { Order, Buyer, EmailTemplate, EmailLog } from "@/types"
import { formatDate } from "@/lib/utils"
import Link from "next/link"

export default function SendEmailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string
  
  const [order, setOrder] = useState<Order | null>(null)
  const [buyer, setBuyer] = useState<Buyer | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([])
  
  // Email form state
  const [emailType, setEmailType] = useState<EmailTemplateType>('deposit_reminder')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [customEmail, setCustomEmail] = useState(false)
  
  useEffect(() => {
    loadOrderDetails()
  }, [orderId])
  
  useEffect(() => {
    if (!customEmail) {
      loadEmailTemplate(emailType)
    }
  }, [emailType, customEmail])
  
  const loadOrderDetails = async () => {
    setLoading(true)
    try {
      // Fetch order details
      const orderData = await fetchOrderById(orderId)
      setOrder(orderData)
      
      // Fetch buyer details
      if (orderData.buyer_id) {
        const buyerData = await fetchBuyerById(orderData.buyer_id)
        setBuyer(buyerData)
      }
      
      // Load email logs
      const logs = await getEmailLogsForOrder(parseInt(orderId))
      setEmailLogs(logs)
      
      // Determine default email type based on order status
      if (orderData.payment_status === 'No Payment Received') {
        setEmailType('deposit_reminder')
      } else if (orderData.payment_status === 'Deposit Paid') {
        setEmailType('final_payment_reminder')
      } else if (orderData.ship_status === 'Shipped') {
        setEmailType('shipping_notification')
      }
      
      // Load default template
      await loadEmailTemplate('deposit_reminder')
    } catch (error) {
      console.error("Error loading order details:", error)
    } finally {
      setLoading(false)
    }
  }
  
  const loadEmailTemplate = async (type: EmailTemplateType) => {
    try {
      const template = await getEmailTemplate(type)
      if (template) {
        setSubject(template.subject)
        setContent(template.content)
      }
    } catch (error) {
      console.error("Error loading email template:", error)
    }
  }
  
  const handleEmailTypeChange = (type: string) => {
    setEmailType(type as EmailTemplateType)
  }
  
  const toggleCustomEmail = () => {
    setCustomEmail(!customEmail)
    if (customEmail) {
      // Switching back to template, reload the template
      loadEmailTemplate(emailType)
    }
  }
  
  const sendEmail = async () => {
    if (!order || !buyer) {
      alert('Missing order or buyer information')
      return
    }
    
    if (!buyer.delivery_contact_email) {
      alert('Buyer does not have an email address')
      return
    }
    
    setSending(true)
    
    try {
      let success = false
      
      if (customEmail) {
        // Send custom email
        success = await sendCustomEmail(order, buyer, subject, content)
      } else {
        // Send template email based on type
        switch (emailType) {
          case 'deposit_reminder':
            success = await sendDepositReminder(order, buyer)
            break
          case 'deposit_confirmation':
            success = await sendDepositConfirmation(order, buyer)
            break
          case 'final_payment_reminder':
            success = await sendFinalPaymentReminder(order, buyer)
            break
          case 'shipping_notification':
            success = await sendShippingNotification(order, buyer)
            break
          default:
            // Fallback to custom email
            success = await sendCustomEmail(order, buyer, subject, content)
        }
      }
      
      if (success) {
        setEmailSent(true)
        // Reload email logs
        const logs = await getEmailLogsForOrder(parseInt(orderId))
        setEmailLogs(logs)
      } else {
        alert('Failed to send email')
      }
    } catch (error) {
      console.error("Error sending email:", error)
      alert('An error occurred while sending the email')
    } finally {
      setSending(false)
    }
  }
  
  const getEmailTypeName = (type: string): string => {
    switch (type) {
      case 'deposit_reminder':
        return 'Deposit Reminder'
      case 'deposit_confirmation':
        return 'Deposit Confirmation'
      case 'final_payment_reminder':
        return 'Final Payment Reminder'
      case 'payment_confirmation':
        return 'Payment Confirmation'
      case 'shipping_notification':
        return 'Shipping Notification'
      case 'custom':
        return 'Custom Email'
      default:
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
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
  
  if (!order || !buyer) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <p className="text-red-500">Order or buyer information not found</p>
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
              <Link href={`/orders/${orderId}`}>
                <IconArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Send Email</h1>
              <p className="text-muted-foreground">
                {order.order_ref || `Order #${order.id}`} - {buyer.name || 'Unknown Buyer'}
              </p>
            </div>
          </div>
        </div>
        
        {emailSent ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="mb-4 text-green-500 flex justify-center">
                <IconMail className="h-12 w-12" />
              </div>
              <h2 className="text-xl font-bold mb-2">Email Sent Successfully!</h2>
              <p className="text-muted-foreground mb-4">
                Your email has been sent to {buyer.delivery_contact_email}.
              </p>
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={() => setEmailSent(false)}>
                  Send Another Email
                </Button>
                <Button asChild>
                  <Link href={`/orders/${orderId}`}>
                    Return to Order
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Email Message</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Label htmlFor="email-type">Email Type</Label>
                      <Select
                        value={emailType}
                        onValueChange={handleEmailTypeChange}
                        disabled={customEmail}
                      >
                        <SelectTrigger id="email-type" className="w-[250px]">
                          <SelectValue placeholder="Select email type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="deposit_reminder">Deposit Reminder</SelectItem>
                          <SelectItem value="deposit_confirmation">Deposit Confirmation</SelectItem>
                          <SelectItem value="final_payment_reminder">Final Payment Reminder</SelectItem>
                          <SelectItem value="payment_confirmation">Payment Confirmation</SelectItem>
                          <SelectItem value="shipping_notification">Shipping Notification</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="custom-email">Custom Email</Label>
                      <input
                        id="custom-email"
                        type="checkbox"
                        checked={customEmail}
                        onChange={toggleCustomEmail}
                        className="h-4 w-4"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="recipient">Recipient</Label>
                    <Input
                      id="recipient"
                      value={buyer.delivery_contact_email || ''}
                      disabled
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      disabled={!customEmail}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="content">Email Content</Label>
                    <Textarea
                      id="content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="min-h-[300px]"
                      disabled={!customEmail}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button onClick={sendEmail} disabled={sending}>
                    <IconMail className="mr-2 h-4 w-4" />
                    {sending ? 'Sending...' : 'Send Email'}
                  </Button>
                </CardFooter>
              </Card>
            </div>
            
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Email History</CardTitle>
                </CardHeader>
                <CardContent>
                  {emailLogs.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      No emails have been sent for this order yet.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {emailLogs.map((log) => (
                        <div key={log.id} className="border rounded-md p-3">
                          <div className="font-medium">
                            {getEmailTypeName(log.email_type)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Sent: {formatDate(log.sent_at)}
                          </div>
                          <div className="text-sm mt-1">
                            To: {log.recipient}
                          </div>
                          <div className="text-sm mt-1 truncate">
                            Subject: {log.subject}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
