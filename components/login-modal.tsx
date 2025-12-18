"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface LoginModalProps {
  onSuccess: () => void
  onClose: () => void
}

export default function LoginModal({ onSuccess, onClose }: LoginModalProps) {
  const [password, setPassword] = useState("admin123")
  const [error, setError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password === "admin123") {
      onSuccess()
    } else {
      setError("Invalid password")
      setPassword("")
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
          <h2 className="text-lg font-semibold mb-6 text-foreground">Admin Access</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-muted-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="Enter password"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3 pt-4">
              <Button onClick={onClose} variant="outline" className="flex-1 bg-transparent">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Login
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
