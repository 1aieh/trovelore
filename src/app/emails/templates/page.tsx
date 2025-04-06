// src/app/emails/templates/page.tsx
"use client"

import React, { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/ui/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { IconDeviceFloppy, IconRefresh } from "@tabler/icons-react"
import { getAllEmailTemplates, saveEmailTemplate, EmailTemplateType, initializeDefaultEmailTemplates } from "@/lib/email-service"
import { EmailTemplate } from "@/types"

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [activeTemplate, setActiveTemplate] = useState<string>('deposit_reminder')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentTemplate, setCurrentTemplate] = useState<EmailTemplate | null>(null)
  
  useEffect(() => {
    loadTemplates()
  }, [])
  
  const loadTemplates = async () => {
    setLoading(true)
    try {
      // Initialize default templates if needed
      await initializeDefaultEmailTemplates()
      
      // Load all templates
      const data = await getAllEmailTemplates()
      setTemplates(data)
      
      // Set current template
      if (data.length > 0) {
        const template = data.find(t => t.type === activeTemplate) || data[0]
        setCurrentTemplate(template)
        setActiveTemplate(template.type)
      }
    } catch (error) {
      console.error('Error loading email templates:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleTemplateChange = (type: string) => {
    const template = templates.find(t => t.type === type)
    if (template) {
      setCurrentTemplate(template)
      setActiveTemplate(type)
    }
  }
  
  const handleSubjectChange = (subject: string) => {
    if (currentTemplate) {
      setCurrentTemplate({
        ...currentTemplate,
        subject
      })
    }
  }
  
  const handleContentChange = (content: string) => {
    if (currentTemplate) {
      setCurrentTemplate({
        ...currentTemplate,
        content
      })
    }
  }
  
  const saveTemplate = async () => {
    if (!currentTemplate) return
    
    setSaving(true)
    try {
      const saved = await saveEmailTemplate(currentTemplate)
      if (saved) {
        // Update templates list
        setTemplates(prev => 
          prev.map(t => t.id === saved.id ? saved : t)
        )
        alert('Template saved successfully')
      }
    } catch (error) {
      console.error('Error saving template:', error)
      alert('Failed to save template')
    } finally {
      setSaving(false)
    }
  }
  
  const resetToDefault = async () => {
    if (!currentTemplate) return
    
    if (confirm('Are you sure you want to reset this template to default? This will overwrite your current changes.')) {
      // Delete current template to trigger re-initialization
      // In a real implementation, you might have a separate API for this
      await saveEmailTemplate({
        ...currentTemplate,
        subject: '',
        content: ''
      })
      
      // Reload templates
      await loadTemplates()
    }
  }
  
  const getTemplateName = (type: string): string => {
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
      default:
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
  }
  
  const getTemplateDescription = (type: string): string => {
    switch (type) {
      case 'deposit_reminder':
        return 'Sent to customers who have not paid their initial 25% deposit.'
      case 'deposit_confirmation':
        return 'Sent to customers after their deposit payment has been received.'
      case 'final_payment_reminder':
        return 'Sent to customers who have paid their deposit but need to pay the remaining balance.'
      case 'payment_confirmation':
        return 'Sent to customers after their final payment has been received.'
      case 'shipping_notification':
        return 'Sent to customers when their order has been shipped.'
      default:
        return 'Custom email template.'
    }
  }
  
  const getAvailableVariables = (type: string): string[] => {
    const commonVariables = [
      'buyer_name',
      'order_ref',
      'order_date',
      'total_amount'
    ]
    
    switch (type) {
      case 'deposit_reminder':
        return [
          ...commonVariables,
          'deposit_amount',
          'payment_link'
        ]
      case 'deposit_confirmation':
        return [
          ...commonVariables,
          'deposit_amount',
          'remaining_amount',
          'estimated_ship_date'
        ]
      case 'final_payment_reminder':
        return [
          ...commonVariables,
          'paid_amount',
          'remaining_amount',
          'payment_link',
          'estimated_ship_date'
        ]
      case 'shipping_notification':
        return [
          ...commonVariables,
          'ship_date',
          'delivery_address',
          'tracking_number',
          'tracking_link'
        ]
      default:
        return commonVariables
    }
  }
  
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p>Loading email templates...</p>
        </div>
      </DashboardLayout>
    )
  }
  
  return (
    <DashboardLayout>
      <div className="px-4 md:px-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Email Templates</h1>
            <p className="text-muted-foreground">
              Customize email templates for different notification types
            </p>
          </div>
        </div>
        
        <Tabs value={activeTemplate} onValueChange={handleTemplateChange}>
          <TabsList className="grid grid-cols-2 md:grid-cols-5">
            <TabsTrigger value="deposit_reminder">Deposit Reminder</TabsTrigger>
            <TabsTrigger value="deposit_confirmation">Deposit Confirmation</TabsTrigger>
            <TabsTrigger value="final_payment_reminder">Final Payment</TabsTrigger>
            <TabsTrigger value="payment_confirmation">Payment Confirmation</TabsTrigger>
            <TabsTrigger value="shipping_notification">Shipping</TabsTrigger>
          </TabsList>
          
          {templates.map((template) => (
            <TabsContent key={template.id} value={template.type} className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{getTemplateName(template.type)}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {getTemplateDescription(template.type)}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentTemplate && currentTemplate.type === template.type && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="subject">Email Subject</Label>
                        <Input
                          id="subject"
                          value={currentTemplate.subject}
                          onChange={(e) => handleSubjectChange(e.target.value)}
                          placeholder="Enter email subject"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="content">Email Content (HTML)</Label>
                        <Textarea
                          id="content"
                          value={currentTemplate.content}
                          onChange={(e) => handleContentChange(e.target.value)}
                          placeholder="Enter email content (HTML supported)"
                          className="min-h-[300px] font-mono text-sm"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Available Variables</Label>
                        <div className="text-sm bg-muted p-3 rounded-md">
                          <p className="mb-2">Use these variables in your template by wrapping them in double curly braces: <code>{'{{variable_name}}'}</code></p>
                          <div className="flex flex-wrap gap-2">
                            {getAvailableVariables(template.type).map((variable) => (
                              <code key={variable} className="bg-background px-2 py-1 rounded-md text-xs">
                                {`{{${variable}}}`}
                              </code>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={resetToDefault}>
                    <IconRefresh className="mr-2 h-4 w-4" />
                    Reset to Default
                  </Button>
                  <Button onClick={saveTemplate} disabled={saving}>
                    <IconDeviceFloppy className="mr-2 h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Template'}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
