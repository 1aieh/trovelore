// src/components/auth-provider.tsx
"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { getCurrentUser, signIn, signOut } from "@/lib/auth"
import { User } from "@/types"

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ success: boolean; message?: string }>
  signOut: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => ({ success: false }),
  signOut: async () => false
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser()
        setUser(currentUser)
      } catch (error) {
        console.error("Error loading user:", error)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  const handleSignIn = async (email: string, password: string) => {
    const result = await signIn(email, password)
    
    if (result.success) {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    }
    
    return result
  }

  const handleSignOut = async () => {
    const success = await signOut()
    
    if (success) {
      setUser(null)
    }
    
    return success
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn: handleSignIn,
        signOut: handleSignOut
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
