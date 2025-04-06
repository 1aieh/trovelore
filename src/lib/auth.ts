// src/lib/auth.ts
import { createClient } from '@supabase/supabase-js'
import { supabaseUrl, supabaseKey } from '@/lib/supabaseClient'
import { User, UserRole } from '@/types'

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey)

// User roles
export const ROLES = {
  ADMIN: 'admin',
  PORTUGAL_OFFICE: 'portugal_office',
  VIEWER: 'viewer'
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error || !session) {
    console.error('Error getting session:', error)
    return null
  }
  
  // Get user profile with role
  const { data, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .single()
  
  if (profileError) {
    console.error('Error getting user profile:', profileError)
    return null
  }
  
  return {
    id: session.user.id,
    email: session.user.email || '',
    name: data?.name || '',
    role: data?.role || ROLES.VIEWER
  }
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<{ success: boolean; message?: string }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) {
    return {
      success: false,
      message: error.message
    }
  }
  
  return { success: true }
}

/**
 * Sign out
 */
export async function signOut(): Promise<boolean> {
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    console.error('Error signing out:', error)
    return false
  }
  
  return true
}

/**
 * Get all users with roles
 */
export async function getAllUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
  
  if (error) {
    console.error('Error getting users:', error)
    return []
  }
  
  return data || []
}

/**
 * Create or update user
 */
export async function upsertUser(user: Partial<User>): Promise<User | null> {
  // If creating a new user, first create auth user
  if (!user.id && user.email && user.password) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true
    })
    
    if (error) {
      console.error('Error creating user:', error)
      return null
    }
    
    user.id = data.user.id
  }
  
  // Update user profile
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({
      user_id: user.id,
      name: user.name,
      role: user.role
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error updating user profile:', error)
    return null
  }
  
  return {
    id: user.id!,
    email: user.email!,
    name: data.name,
    role: data.role
  }
}

/**
 * Delete user
 */
export async function deleteUser(userId: string): Promise<boolean> {
  // Delete user profile
  const { error: profileError } = await supabase
    .from('user_profiles')
    .delete()
    .eq('user_id', userId)
  
  if (profileError) {
    console.error('Error deleting user profile:', profileError)
    return false
  }
  
  // Delete auth user
  const { error } = await supabase.auth.admin.deleteUser(userId)
  
  if (error) {
    console.error('Error deleting user:', error)
    return false
  }
  
  return true
}

/**
 * Check if user has required role
 */
export function hasRole(user: User | null, requiredRole: UserRole): boolean {
  if (!user) return false
  
  // Admin has access to everything
  if (user.role === ROLES.ADMIN) return true
  
  // Check specific role
  return user.role === requiredRole
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case ROLES.ADMIN:
      return 'Administrator'
    case ROLES.PORTUGAL_OFFICE:
      return 'Portugal Office'
    case ROLES.VIEWER:
      return 'Viewer'
    default:
      return role
  }
}
