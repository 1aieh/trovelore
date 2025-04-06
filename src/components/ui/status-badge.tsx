// src/components/ui/status-badge.tsx
"use client"

import React from "react"
import { Badge, BadgeProps } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type StatusType = "payment" | "shipping" | "block"

interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
  status: string
  type: StatusType
}

export function StatusBadge({ status, type, className, ...props }: StatusBadgeProps) {
  // Define status variants based on type
  const getVariant = (): BadgeProps["variant"] => {
    if (type === "payment") {
      switch (status.toLowerCase()) {
        case "no payment received":
        case "0%":
          return "destructive"
        case "deposit paid":
        case "25%":
        case "50%":
        case "75%":
        case "partial payment":
          return "warning"
        case "100%":
        case "paid":
          return "success"
        default:
          return "outline"
      }
    } else if (type === "shipping") {
      switch (status.toLowerCase()) {
        case "not shipped":
          return "outline"
        case "in production":
          return "secondary"
        case "shipped":
          return "warning"
        case "delivered":
          return "success"
        default:
          return "outline"
      }
    } else if (type === "block") {
      switch (status.toLowerCase()) {
        case "pending":
          return "outline"
        case "in production":
          return "secondary"
        case "shipped":
          return "warning"
        case "closed":
          return "success"
        default:
          return "outline"
      }
    }
    
    return "outline"
  }

  return (
    <Badge 
      variant={getVariant()} 
      className={cn("capitalize", className)}
      {...props}
    >
      {status}
    </Badge>
  )
}
