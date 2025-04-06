// src/components/ui/order-card.tsx
"use client"

import React from "react"
import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { PaymentStatusIndicator } from "@/components/ui/payment-status-indicator"
import { Button } from "@/components/ui/button"
import { IconCalendarEvent, IconEye, IconPencil } from "@tabler/icons-react"
import { formatCurrency, formatDate } from "@/lib/utils"

interface OrderCardProps {
  id: number
  orderRef: string
  orderDate: string
  buyer: string
  paymentStatus: string
  shipStatus: string
  totalAmount: number
  paidAmount: number
  blockName?: string
  className?: string
}

export function OrderCard({
  id,
  orderRef,
  orderDate,
  buyer,
  paymentStatus,
  shipStatus,
  totalAmount,
  paidAmount,
  blockName,
  className
}: OrderCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-medium">
            <Link href={`/orders/${id}`} className="hover:underline">
              {orderRef}
            </Link>
          </CardTitle>
          <StatusBadge status={shipStatus} type="shipping" />
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-1">
          <span>{formatDate(orderDate)}</span>
          {blockName && (
            <>
              <span className="mx-1">•</span>
              <span className="flex items-center gap-1">
                <IconCalendarEvent className="h-3 w-3" />
                {blockName}
              </span>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="mb-3">
          <div className="font-medium">{buyer}</div>
        </div>
        <PaymentStatusIndicator
          status={paymentStatus}
          totalAmount={totalAmount}
          paidAmount={paidAmount}
        />
        <div className="mt-2 flex justify-between text-sm">
          <span className="text-muted-foreground">Total:</span>
          <span className="font-medium">{formatCurrency(totalAmount)}</span>
        </div>
      </CardContent>
      <CardFooter className="pt-0 flex justify-between">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/orders/${id}`}>
            <IconEye className="h-4 w-4 mr-1" />
            View
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/orders/${id}/edit`}>
            <IconPencil className="h-4 w-4 mr-1" />
            Edit
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
