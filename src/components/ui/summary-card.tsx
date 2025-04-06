// src/components/ui/summary-card.tsx
"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface SummaryCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  description?: string
  trend?: {
    value: number
    label: string
  }
  className?: string
}

export function SummaryCard({
  title,
  value,
  icon,
  description,
  trend,
  className
}: SummaryCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-4 w-4 text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <div className="mt-2 flex items-center text-xs">
            <span
              className={cn(
                "mr-1",
                trend.value > 0
                  ? "text-green-500"
                  : trend.value < 0
                  ? "text-red-500"
                  : "text-muted-foreground"
              )}
            >
              {trend.value > 0 ? "↑" : trend.value < 0 ? "↓" : "→"}
              {Math.abs(trend.value)}%
            </span>
            <span className="text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
