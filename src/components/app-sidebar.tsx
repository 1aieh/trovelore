// src/components/app-sidebar.tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  IconBuildingStore,
  IconCalendarEvent,
  IconChartBar,
  IconCreditCard,
  IconFileInvoice,
  IconPackage,
  IconSettings,
  IconTruckDelivery,
  IconUsers,
} from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sidebar, SidebarFooter, SidebarHeader, SidebarMain, SidebarNav, SidebarNavHeader, SidebarNavHeaderTitle, SidebarNavLink, SidebarNavMain } from "@/components/ui/sidebar"

interface AppSidebarProps {
  variant?: "drawer" | "inset"
}

export function AppSidebar({ variant = "drawer" }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <Sidebar variant={variant}>
      <SidebarHeader className="border-b border-border">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <IconPackage className="h-6 w-6" />
          <span className="text-xl font-bold">Trovelore</span>
        </Link>
      </SidebarHeader>
      <SidebarMain className="flex flex-col gap-4">
        <SidebarNav>
          <SidebarNavMain>
            <SidebarNavLink asChild active={pathname === "/dashboard"}>
              <Link href="/dashboard">
                <IconChartBar className="h-4 w-4" />
                Dashboard
              </Link>
            </SidebarNavLink>
            <SidebarNavLink asChild active={pathname === "/orders" || pathname.startsWith("/orders/")}>
              <Link href="/orders">
                <IconFileInvoice className="h-4 w-4" />
                Orders
              </Link>
            </SidebarNavLink>
            <SidebarNavLink asChild active={pathname === "/blocks" || pathname.startsWith("/blocks/")}>
              <Link href="/blocks">
                <IconCalendarEvent className="h-4 w-4" />
                Blocks
              </Link>
            </SidebarNavLink>
            <SidebarNavLink asChild active={pathname === "/buyers" || pathname.startsWith("/buyers/")}>
              <Link href="/buyers">
                <IconUsers className="h-4 w-4" />
                Buyers
              </Link>
            </SidebarNavLink>
            <SidebarNavLink asChild active={pathname === "/payments" || pathname.startsWith("/payments/")}>
              <Link href="/payments">
                <IconCreditCard className="h-4 w-4" />
                Payments
              </Link>
            </SidebarNavLink>
            <SidebarNavLink asChild active={pathname === "/shipping" || pathname.startsWith("/shipping/")}>
              <Link href="/shipping">
                <IconTruckDelivery className="h-4 w-4" />
                Shipping
              </Link>
            </SidebarNavLink>
          </SidebarNavMain>
        </SidebarNav>
        <SidebarNav>
          <SidebarNavHeader>
            <SidebarNavHeaderTitle>Integrations</SidebarNavHeaderTitle>
          </SidebarNavHeader>
          <SidebarNavMain>
            <SidebarNavLink asChild active={pathname === "/shopify" || pathname.startsWith("/shopify/")}>
              <Link href="/shopify">
                <IconBuildingStore className="h-4 w-4" />
                Shopify
              </Link>
            </SidebarNavLink>
          </SidebarNavMain>
        </SidebarNav>
      </SidebarMain>
      <SidebarFooter>
        <Button variant="ghost" size="icon" asChild className="w-full justify-start gap-2">
          <Link href="/settings">
            <IconSettings className="h-4 w-4" />
            <span>Settings</span>
          </Link>
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
