// src/components/role-guard.tsx
"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { hasRole } from "@/lib/auth"
import { UserRole } from "@/types"

interface RoleGuardProps {
  children: React.ReactNode
  requiredRole: UserRole
  fallback?: React.ReactNode
  redirectTo?: string
}

export function RoleGuard({
  children,
  requiredRole,
  fallback,
  redirectTo = "/login"
}: RoleGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  // Show loading state
  if (loading) {
    return <div>Loading...</div>
  }

  // Redirect if not authenticated
  if (!user) {
    if (typeof window !== "undefined") {
      router.push(redirectTo)
    }
    return null
  }

  // Check if user has required role
  if (!hasRole(user, requiredRole)) {
    // Show fallback if provided, otherwise redirect
    if (fallback) {
      return <>{fallback}</>
    }

    if (typeof window !== "undefined") {
      router.push("/unauthorized")
    }
    return null
  }

  // User has required role, render children
  return <>{children}</>
}
