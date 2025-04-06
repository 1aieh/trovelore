// src/components/ui/block-card.tsx
"use client"

import React from "react"
import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { IconEye, IconPackage } from "@tabler/icons-react"
import { formatDate } from "@/lib/utils"

interface BlockCardProps {
  id: number
  name: string
  shipMonth: string
  shipStatus: string
  orderCount: number
  className?: string
}

export function BlockCard({
  id,
  name,
  shipMonth,
  shipStatus,
  orderCount,
  className
}: BlockCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-medium">
            <Link href={`/blocks/${id}`} className="hover:underline">
              {name}
            </Link>
          </CardTitle>
          <StatusBadge status={shipStatus} type="block" />
        </div>
        <div className="text-sm text-muted-foreground">
          Ship Month: {formatDate(shipMonth, { month: 'long', year: 'numeric' })}
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex items-center gap-2">
          <IconPackage className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">{orderCount} Orders</span>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link href={`/blocks/${id}`}>
            <IconEye className="h-4 w-4 mr-1" />
            View Block
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
