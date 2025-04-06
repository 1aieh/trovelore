// src/app/users/page.tsx
"use client"

import React, { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/ui/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RoleGuard } from "@/components/role-guard"
import { ROLES, getRoleDisplayName, getAllUsers, upsertUser, deleteUser } from "@/lib/auth"
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react"
import { User, UserRole } from "@/types"

export default function UsersPage() {
  return (
    <RoleGuard requiredRole={ROLES.ADMIN}>
      <UsersManagement />
    </RoleGuard>
  )
}

function UsersManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<Partial<User> | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  useEffect(() => {
    loadUsers()
  }, [])
  
  const loadUsers = async () => {
    setLoading(true)
    try {
      const data = await getAllUsers()
      setUsers(data)
    } catch (error) {
      console.error("Error loading users:", error)
    } finally {
      setLoading(false)
    }
  }
  
  const openCreateDialog = () => {
    setCurrentUser({
      name: "",
      email: "",
      role: ROLES.VIEWER,
      password: ""
    })
    setIsDialogOpen(true)
  }
  
  const openEditDialog = (user: User) => {
    setCurrentUser({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    })
    setIsDialogOpen(true)
  }
  
  const openDeleteDialog = (user: User) => {
    setCurrentUser(user)
    setIsDeleteDialogOpen(true)
  }
  
  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setCurrentUser(null)
  }
  
  const handleDeleteDialogClose = () => {
    setIsDeleteDialogOpen(false)
    setCurrentUser(null)
  }
  
  const handleInputChange = (field: string, value: string) => {
    if (currentUser) {
      setCurrentUser({
        ...currentUser,
        [field]: value
      })
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentUser) return
    
    setIsSubmitting(true)
    
    try {
      await upsertUser(currentUser)
      await loadUsers()
      handleDialogClose()
    } catch (error) {
      console.error("Error saving user:", error)
      alert("Failed to save user")
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleDelete = async () => {
    if (!currentUser || !currentUser.id) return
    
    setIsSubmitting(true)
    
    try {
      await deleteUser(currentUser.id)
      await loadUsers()
      handleDeleteDialogClose()
    } catch (error) {
      console.error("Error deleting user:", error)
      alert("Failed to delete user")
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <DashboardLayout>
      <div className="px-4 md:px-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground">
              Manage user accounts and permissions
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <IconPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No users found
              </div>
            ) : (
              <div className="rounded-md border">
                <table className="min-w-full divide-y divide-border">
                  <thead>
                    <tr className="divide-x divide-border">
                      <th className="px-4 py-3.5 text-left text-sm font-semibold">Name</th>
                      <th className="px-4 py-3.5 text-left text-sm font-semibold">Email</th>
                      <th className="px-4 py-3.5 text-center text-sm font-semibold">Role</th>
                      <th className="px-4 py-3.5 text-center text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {users.map((user) => (
                      <tr key={user.id} className="divide-x divide-border">
                        <td className="px-4 py-3 text-sm font-medium">
                          {user.name}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {user.email}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary/10 text-primary">
                            {getRoleDisplayName(user.role)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex justify-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => openEditDialog(user)}>
                              <IconEdit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openDeleteDialog(user)}>
                              <IconTrash className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Create/Edit User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentUser?.id ? "Edit User" : "Create User"}
            </DialogTitle>
            <DialogDescription>
              {currentUser?.id 
                ? "Update user details and permissions" 
                : "Add a new user to the system"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={currentUser?.name || ""}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={currentUser?.email || ""}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                  disabled={!!currentUser?.id} // Can't change email for existing users
                />
              </div>
              {!currentUser?.id && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={currentUser?.password || ""}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    required={!currentUser?.id} // Required for new users
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={currentUser?.role || ROLES.VIEWER}
                  onValueChange={(value) => handleInputChange("role", value as UserRole)}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ROLES.ADMIN}>Administrator</SelectItem>
                    <SelectItem value={ROLES.PORTUGAL_OFFICE}>Portugal Office</SelectItem>
                    <SelectItem value={ROLES.VIEWER}>Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={handleDialogClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting 
                  ? "Saving..." 
                  : currentUser?.id ? "Update User" : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete User Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p><strong>Name:</strong> {currentUser?.name}</p>
            <p><strong>Email:</strong> {currentUser?.email}</p>
            <p><strong>Role:</strong> {currentUser?.role && getRoleDisplayName(currentUser.role)}</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleDeleteDialogClose}>
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
