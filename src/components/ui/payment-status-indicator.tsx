// src/components/ui/payment-status-indicator.tsx
"use client"

import React from "react"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface PaymentStatusIndicatorProps {
  status: string
  depositAmount?: number
  totalAmount?: number
  paidAmount?: number
  className?: string
}

export function PaymentStatusIndicator({ 
  status, 
  depositAmount = 0, 
  totalAmount = 0, 
  paidAmount = 0,
  className 
}: PaymentStatusIndicatorProps) {
  // Calculate payment percentage
  const getPaymentPercentage = (): number => {
    if (totalAmount <= 0) return 0
    return Math.min(100, Math.round((paidAmount / totalAmount) * 100))
  }

  // Get color based on payment status
  const getColorClass = (): string => {
    const percentage = getPaymentPercentage()
    
    if (percentage === 0) return "bg-red-500"
    if (percentage < 50) return "bg-amber-500"
    if (percentage < 100) return "bg-blue-500"
    return "bg-green-500"
  }

  // Get text representation
  const getStatusText = (): string => {
    const percentage = getPaymentPercentage()
    
    if (percentage === 0) return "No Payment"
    if (percentage === 25) return "Deposit Paid (25%)"
    if (percentage === 100) return "Fully Paid"
    return `${percentage}% Paid`
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex justify-between text-sm">
        <span>{getStatusText()}</span>
        <span>{paidAmount > 0 ? `${paidAmount}/${totalAmount}` : ""}</span>
      </div>
      <Progress 
        value={getPaymentPercentage()} 
        className="h-2"
        indicatorClassName={getColorClass()}
      />
    </div>
  )
}
