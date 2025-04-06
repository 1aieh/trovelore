// src/components/ui/order-filter.tsx
"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { IconFilter, IconSearch, IconX } from "@tabler/icons-react"
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface OrderFilterProps {
  onFilterChange: (filters: OrderFilters) => void
  className?: string
}

export interface OrderFilters {
  search?: string
  paymentStatus?: string
  shipStatus?: string
  blockId?: string
  dateFrom?: Date
  dateTo?: Date
}

export function OrderFilter({ onFilterChange, className }: OrderFilterProps) {
  const [filters, setFilters] = useState<OrderFilters>({})
  const [isOpen, setIsOpen] = useState(false)

  const handleFilterChange = (key: keyof OrderFilters, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
  }

  const applyFilters = () => {
    onFilterChange(filters)
    setIsOpen(false)
  }

  const clearFilters = () => {
    setFilters({})
    onFilterChange({})
    setIsOpen(false)
  }

  return (
    <div className={className}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <IconSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            className="pl-8"
            value={filters.search || ""}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
          />
        </div>
        
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <IconFilter className="h-4 w-4" />
              Filter
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Order Filters</h4>
                <p className="text-sm text-muted-foreground">
                  Filter orders by various criteria
                </p>
              </div>
              
              <div className="grid gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium leading-none">From</label>
                    <DatePicker
                      date={filters.dateFrom}
                      setDate={(date) => handleFilterChange("dateFrom", date)}
                      placeholder="From date"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium leading-none">To</label>
                    <DatePicker
                      date={filters.dateTo}
                      setDate={(date) => handleFilterChange("dateTo", date)}
                      placeholder="To date"
                    />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="text-sm font-medium leading-none">Payment Status</label>
                  <Select
                    value={filters.paymentStatus || ""}
                    onValueChange={(value) => handleFilterChange("paymentStatus", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any payment status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any payment status</SelectItem>
                      <SelectItem value="No Payment Received">No Payment</SelectItem>
                      <SelectItem value="Deposit Paid">Deposit Paid</SelectItem>
                      <SelectItem value="Partial Payment">Partial Payment</SelectItem>
                      <SelectItem value="Paid">Fully Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1">
                  <label className="text-sm font-medium leading-none">Shipping Status</label>
                  <Select
                    value={filters.shipStatus || ""}
                    onValueChange={(value) => handleFilterChange("shipStatus", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any shipping status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any shipping status</SelectItem>
                      <SelectItem value="Not Shipped">Not Shipped</SelectItem>
                      <SelectItem value="In Production">In Production</SelectItem>
                      <SelectItem value="Shipped">Shipped</SelectItem>
                      <SelectItem value="Delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-between">
                <Button variant="outline" size="sm" onClick={clearFilters} className="gap-1">
                  <IconX className="h-4 w-4" />
                  Clear
                </Button>
                <Button size="sm" onClick={applyFilters}>Apply Filters</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
