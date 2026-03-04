"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
// Make sure this path matches where you defined your Supabase client
import { createClient } from "@/lib/supabase/client"

interface LoginModalProps {
  onSuccess: () => void
  onClose: () => void
}

export default function LoginModal({ onSuccess, onClose }: LoginModalProps) {
  // Supabase Auth uses email; changed from 'username' for compatibility
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // 1. Authenticate the user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw new Error(authError.message)

      // 2. Fetch the admin role from your 'admins' table
      // Because of your RLS policy (auth.uid() = id), this will only return 
      // data if the logged-in user's UUID exists in the 'admins' table.
      const { data: adminRecord, error: dbError } = await supabase
        .from('admins')
        .select('role')
        .single()

      if (dbError || !adminRecord) {
        // Log them out if they aren't in the admin table to keep the session clean
        await supabase.auth.signOut()
        throw new Error("Access denied: You are not registered as an administrator.")
      }

      // Success! User is authenticated and verified in the database
      onSuccess()
    } catch (err: any) {
      setError(err.message || "Invalid credentials")
    } finally {
      setLoading(false)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <>
      <div
        onClick={handleBackdropClick}
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 transition-opacity duration-200"
      />

      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div className="pointer-events-auto bg-card rounded-lg shadow-xl p-8 w-full max-w-sm border border-border">
          <h2 className="text-lg font-semibold mb-6 text-foreground">
            Admin Access
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Admin Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="admin@scheduling.com"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="flex-1 bg-transparent"
                disabled={loading}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                className="flex-1"
                disabled={loading}
              >
                {loading ? "Verifying..." : "Login"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}