// src/lib/email-service.ts
import { createClient } from '@supabase/supabase-js'
import { supabaseUrl, supabaseAnonKey } from '@/lib/supabaseClient'
import { Order, Buyer, EmailTemplate, EmailLog } from '@/types'

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Email template types
export type EmailTemplateType = 
  | 'deposit_reminder'
  | 'deposit_confirmation'
  | 'final_payment_reminder'
  | 'payment_confirmation'
  | 'shipping_notification'
  | 'custom'

// Email service configuration
interface EmailServiceConfig {
  fromEmail: string
  fromName: string
  replyTo?: string
}

// Default configuration
const defaultConfig: EmailServiceConfig = {
  fromEmail: 'orders@trovelore.com',
  fromName: 'Trovelore Orders',
  replyTo: 'support@trovelore.com'
}

/**
 * Get email template by type
 */
export async function getEmailTemplate(type: EmailTemplateType): Promise<EmailTemplate | null> {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('type', type)
    .single()
  
  if (error) {
    console.error('Error fetching email template:', error)
    return null
  }
  
  return data
}

/**
 * Get all email templates
 */
export async function getAllEmailTemplates(): Promise<EmailTemplate[]> {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .order('type')
  
  if (error) {
    console.error('Error fetching email templates:', error)
    return []
  }
  
  return data || []
}

/**
 * Save or update email template
 */
export async function saveEmailTemplate(template: Partial<EmailTemplate>): Promise<EmailTemplate | null> {
  const { data, error } = await supabase
    .from('email_templates')
    .upsert(template)
    .select()
    .single()
  
  if (error) {
    console.error('Error saving email template:', error)
    return null
  }
  
  return data
}

/**
 * Process template with variables
 */
function processTemplate(template: string, variables: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] !== undefined ? variables[key] : match
  })
}

/**
 * Send email using external email service
 * Note: This is a placeholder for actual email sending implementation
 * You would integrate with a service like SendGrid, Mailgun, etc.
 */
async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
  config: EmailServiceConfig = defaultConfig
): Promise<boolean> {
  // This is where you would integrate with your email service provider
  // For now, we'll just log the email and return success
  console.log('Sending email:')
  console.log('To:', to)
  console.log('Subject:', subject)
  console.log('From:', `${config.fromName} <${config.fromEmail}>`)
  
  // In a real implementation, you would call your email service API here
  // For example, with SendGrid:
  // const response = await sendgrid.send({
  //   to,
  //   from: `${config.fromName} <${config.fromEmail}>`,
  //   subject,
  //   html: htmlContent,
  // })
  
  // For now, simulate a successful send
  return true
}

/**
 * Log email in database
 */
async function logEmail(
  orderId: number,
  buyerId: number,
  emailType: EmailTemplateType,
  recipient: string,
  subject: string
): Promise<EmailLog | null> {
  const { data, error } = await supabase
    .from('email_logs')
    .insert({
      order_id: orderId,
      buyer_id: buyerId,
      email_type: emailType,
      recipient,
      subject,
      sent_at: new Date().toISOString()
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error logging email:', error)
    return null
  }
  
  return data
}

/**
 * Get email logs for an order
 */
export async function getEmailLogsForOrder(orderId: number): Promise<EmailLog[]> {
  const { data, error } = await supabase
    .from('email_logs')
    .select('*')
    .eq('order_id', orderId)
    .order('sent_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching email logs:', error)
    return []
  }
  
  return data || []
}

/**
 * Send deposit reminder email
 */
export async function sendDepositReminder(order: Order, buyer: Buyer): Promise<boolean> {
  // Get deposit reminder template
  const template = await getEmailTemplate('deposit_reminder')
  if (!template) {
    console.error('Deposit reminder template not found')
    return false
  }
  
  // Calculate deposit amount (25% of total)
  const depositAmount = order.total_topay ? (order.total_topay * 0.25).toFixed(2) : '0.00'
  
  // Prepare variables for template
  const variables = {
    buyer_name: buyer.name || 'Valued Customer',
    order_ref: order.order_ref || `Order #${order.id}`,
    order_date: new Date(order.order_date || order.created_at || '').toLocaleDateString(),
    deposit_amount: depositAmount,
    total_amount: order.total_topay ? order.total_topay.toFixed(2) : '0.00',
    payment_link: `https://yourdomain.com/pay/${order.id}` // Replace with actual payment link
  }
  
  // Process template with variables
  const subject = processTemplate(template.subject, variables)
  const htmlContent = processTemplate(template.content, variables)
  
  // Send email
  const success = await sendEmail(buyer.delivery_contact_email || '', subject, htmlContent)
  
  // Log email if sent successfully
  if (success) {
    await logEmail(
      order.id!,
      buyer.id!,
      'deposit_reminder',
      buyer.delivery_contact_email || '',
      subject
    )
  }
  
  return success
}

/**
 * Send deposit confirmation email
 */
export async function sendDepositConfirmation(order: Order, buyer: Buyer): Promise<boolean> {
  // Get deposit confirmation template
  const template = await getEmailTemplate('deposit_confirmation')
  if (!template) {
    console.error('Deposit confirmation template not found')
    return false
  }
  
  // Calculate remaining amount (75% of total)
  const depositAmount = order.payment_1 ? order.payment_1.toFixed(2) : '0.00'
  const remainingAmount = order.total_topay && order.payment_1 
    ? (order.total_topay - order.payment_1).toFixed(2) 
    : '0.00'
  
  // Prepare variables for template
  const variables = {
    buyer_name: buyer.name || 'Valued Customer',
    order_ref: order.order_ref || `Order #${order.id}`,
    order_date: new Date(order.order_date || order.created_at || '').toLocaleDateString(),
    deposit_amount: depositAmount,
    remaining_amount: remainingAmount,
    total_amount: order.total_topay ? order.total_topay.toFixed(2) : '0.00',
    estimated_ship_date: order.ship_date 
      ? new Date(order.ship_date).toLocaleDateString() 
      : 'To be determined'
  }
  
  // Process template with variables
  const subject = processTemplate(template.subject, variables)
  const htmlContent = processTemplate(template.content, variables)
  
  // Send email
  const success = await sendEmail(buyer.delivery_contact_email || '', subject, htmlContent)
  
  // Log email if sent successfully
  if (success) {
    await logEmail(
      order.id!,
      buyer.id!,
      'deposit_confirmation',
      buyer.delivery_contact_email || '',
      subject
    )
  }
  
  return success
}

/**
 * Send final payment reminder email
 */
export async function sendFinalPaymentReminder(order: Order, buyer: Buyer): Promise<boolean> {
  // Get final payment reminder template
  const template = await getEmailTemplate('final_payment_reminder')
  if (!template) {
    console.error('Final payment reminder template not found')
    return false
  }
  
  // Calculate remaining amount
  const paidAmount = order.payment_1 || 0
  const remainingAmount = order.total_topay ? (order.total_topay - paidAmount).toFixed(2) : '0.00'
  
  // Prepare variables for template
  const variables = {
    buyer_name: buyer.name || 'Valued Customer',
    order_ref: order.order_ref || `Order #${order.id}`,
    order_date: new Date(order.order_date || order.created_at || '').toLocaleDateString(),
    paid_amount: paidAmount.toFixed(2),
    remaining_amount: remainingAmount,
    total_amount: order.total_topay ? order.total_topay.toFixed(2) : '0.00',
    payment_link: `https://yourdomain.com/pay/${order.id}`, // Replace with actual payment link
    estimated_ship_date: order.ship_date 
      ? new Date(order.ship_date).toLocaleDateString() 
      : 'To be determined'
  }
  
  // Process template with variables
  const subject = processTemplate(template.subject, variables)
  const htmlContent = processTemplate(template.content, variables)
  
  // Send email
  const success = await sendEmail(buyer.delivery_contact_email || '', subject, htmlContent)
  
  // Log email if sent successfully
  if (success) {
    await logEmail(
      order.id!,
      buyer.id!,
      'final_payment_reminder',
      buyer.delivery_contact_email || '',
      subject
    )
  }
  
  return success
}

/**
 * Send shipping notification email
 */
export async function sendShippingNotification(order: Order, buyer: Buyer): Promise<boolean> {
  // Get shipping notification template
  const template = await getEmailTemplate('shipping_notification')
  if (!template) {
    console.error('Shipping notification template not found')
    return false
  }
  
  // Prepare variables for template
  const variables = {
    buyer_name: buyer.name || 'Valued Customer',
    order_ref: order.order_ref || `Order #${order.id}`,
    order_date: new Date(order.order_date || order.created_at || '').toLocaleDateString(),
    ship_date: order.ship_date ? new Date(order.ship_date).toLocaleDateString() : 'Today',
    delivery_address: buyer.delivery_address || 'Your registered address',
    tracking_number: '123456789', // Replace with actual tracking number
    tracking_link: 'https://tracking.example.com/123456789' // Replace with actual tracking link
  }
  
  // Process template with variables
  const subject = processTemplate(template.subject, variables)
  const htmlContent = processTemplate(template.content, variables)
  
  // Send email
  const success = await sendEmail(buyer.delivery_contact_email || '', subject, htmlContent)
  
  // Log email if sent successfully
  if (success) {
    await logEmail(
      order.id!,
      buyer.id!,
      'shipping_notification',
      buyer.delivery_contact_email || '',
      subject
    )
  }
  
  return success
}

/**
 * Send custom email
 */
export async function sendCustomEmail(
  order: Order,
  buyer: Buyer,
  subject: string,
  content: string
): Promise<boolean> {
  // Prepare variables for template
  const variables = {
    buyer_name: buyer.name || 'Valued Customer',
    order_ref: order.order_ref || `Order #${order.id}`,
    order_date: new Date(order.order_date || order.created_at || '').toLocaleDateString(),
    total_amount: order.total_topay ? order.total_topay.toFixed(2) : '0.00'
  }
  
  // Process template with variables
  const processedSubject = processTemplate(subject, variables)
  const processedContent = processTemplate(content, variables)
  
  // Send email
  const success = await sendEmail(buyer.delivery_contact_email || '', processedSubject, processedContent)
  
  // Log email if sent successfully
  if (success) {
    await logEmail(
      order.id!,
      buyer.id!,
      'custom',
      buyer.delivery_contact_email || '',
      processedSubject
    )
  }
  
  return success
}

/**
 * Send batch payment reminders
 */
export async function sendBatchPaymentReminders(
  orderIds: number[],
  reminderType: 'deposit' | 'final'
): Promise<{ success: number; failed: number }> {
  let successCount = 0
  let failedCount = 0
  
  // Fetch orders with buyer information
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      *,
      buyers:buyer_id (*)
    `)
    .in('id', orderIds)
  
  if (error) {
    console.error('Error fetching orders for batch reminders:', error)
    return { success: 0, failed: orderIds.length }
  }
  
  // Send reminders for each order
  for (const order of orders) {
    const buyer = order.buyers
    
    if (!buyer || !buyer.delivery_contact_email) {
      failedCount++
      continue
    }
    
    let success = false
    
    if (reminderType === 'deposit') {
      success = await sendDepositReminder(order, buyer)
    } else {
      success = await sendFinalPaymentReminder(order, buyer)
    }
    
    if (success) {
      successCount++
    } else {
      failedCount++
    }
  }
  
  return { success: successCount, failed: failedCount }
}

/**
 * Initialize default email templates if they don't exist
 */
export async function initializeDefaultEmailTemplates(): Promise<void> {
  const defaultTemplates: Partial<EmailTemplate>[] = [
    {
      type: 'deposit_reminder',
      subject: 'Deposit Required: {{order_ref}}',
      content: `
        <h1>Deposit Required for Your Order</h1>
        <p>Dear {{buyer_name}},</p>
        <p>Thank you for your order ({{order_ref}}) placed on {{order_date}}.</p>
        <p>To proceed with production, we require a 25% deposit of {{deposit_amount}} for your total order amount of {{total_amount}}.</p>
        <p>Please click the link below to make your deposit payment:</p>
        <p><a href="{{payment_link}}">Make Deposit Payment</a></p>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <p>Thank you,<br>Trovelore Team</p>
      `
    },
    {
      type: 'deposit_confirmation',
      subject: 'Deposit Received: {{order_ref}}',
      content: `
        <h1>Deposit Received - Thank You!</h1>
        <p>Dear {{buyer_name}},</p>
        <p>We have received your deposit of {{deposit_amount}} for order {{order_ref}}.</p>
        <p>Your order is now in production. The remaining balance of {{remaining_amount}} will be due before shipping.</p>
        <p>Estimated shipping date: {{estimated_ship_date}}</p>
        <p>Thank you for your business!</p>
        <p>Best regards,<br>Trovelore Team</p>
      `
    },
    {
      type: 'final_payment_reminder',
      subject: 'Final Payment Required: {{order_ref}}',
      content: `
        <h1>Final Payment Required</h1>
        <p>Dear {{buyer_name}},</p>
        <p>Your order ({{order_ref}}) is ready to ship!</p>
        <p>You have already paid {{paid_amount}} as deposit. The remaining balance of {{remaining_amount}} is now due before we can ship your order.</p>
        <p>Please click the link below to make your final payment:</p>
        <p><a href="{{payment_link}}">Make Final Payment</a></p>
        <p>Estimated shipping date after payment: {{estimated_ship_date}}</p>
        <p>Thank you,<br>Trovelore Team</p>
      `
    },
    {
      type: 'payment_confirmation',
      subject: 'Payment Received: {{order_ref}}',
      content: `
        <h1>Payment Received - Thank You!</h1>
        <p>Dear {{buyer_name}},</p>
        <p>We have received your payment for order {{order_ref}}.</p>
        <p>Your order is now fully paid and will be shipped soon.</p>
        <p>We will send you a shipping confirmation with tracking information once your order is on its way.</p>
        <p>Thank you for your business!</p>
        <p>Best regards,<br>Trovelore Team</p>
      `
    },
    {
      type: 'shipping_notification',
      subject: 'Your Order Has Shipped: {{order_ref}}',
      content: `
        <h1>Your Order Has Shipped!</h1>
        <p>Dear {{buyer_name}},</p>
        <p>Great news! Your order ({{order_ref}}) has been shipped on {{ship_date}}.</p>
        <p>Delivery Address:<br>{{delivery_address}}</p>
        <p>Tracking Number: {{tracking_number}}</p>
        <p>You can track your package here: <a href="{{tracking_link}}">Track Your Order</a></p>
        <p>Thank you for shopping with us!</p>
        <p>Best regards,<br>Trovelore Team</p>
      `
    }
  ]
  
  // Check existing templates
  const existingTemplates = await getAllEmailTemplates()
  const existingTypes = existingTemplates.map(t => t.type)
  
  // Insert only templates that don't exist
  for (const template of defaultTemplates) {
    if (!existingTypes.includes(template.type as EmailTemplateType)) {
      await saveEmailTemplate(template)
    }
  }
}
