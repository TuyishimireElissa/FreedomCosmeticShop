"use client"

/**
 * AdminLoginScreen — branded admin login page.
 *
 * Features:
 *   - BeautyHub Rwanda branding + "Admin Control Panel" title
 *   - Phone + password login (reuses existing auth API)
 *   - Show/hide password toggle
 *   - Failed attempt counter (lock after 5 attempts, 30min lockout)
 *   - "Remember this device" checkbox (30 days)
 *   - "Secure Admin Access Only" footer
 *   - Redirects to dashboard on successful admin login
 *   - Shows "Access Denied" if non-admin tries to log in
 *
 * This does NOT replace the customer LoginView — it's a separate
 * admin-specific login screen shown only when accessing the admin panel.
 */

import { useState, useEffect } from "react"
import { useStore } from "@/store/useStore"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Sparkles,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Shield,
  Loader2,
  AlertCircle,
  ArrowRight,
} from "lucide-react"

const MAX_ATTEMPTS = 5
const LOCK_DURATION_MS = 30 * 60 * 1000 // 30 minutes
const LOCK_STORAGE_KEY = "ubumwe-admin-lockout"

interface AdminLoginScreenProps {
  onBack: () => void
}

export function AdminLoginScreen({ onBack }: AdminLoginScreenProps) {
  const { login, fetchUser } = useStore()
  const { toast } = useToast()

  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberDevice, setRememberDevice] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)

  // Check lockout on mount
  useEffect(() => {
    const stored = localStorage.getItem(LOCK_STORAGE_KEY)
    if (stored) {
      const lockTime = parseInt(stored)
      if (Date.now() < lockTime) {
        setLockedUntil(lockTime)
      } else {
        localStorage.removeItem(LOCK_STORAGE_KEY)
      }
    }
  }, [])

  // Check if "Remember device" is already set
  useEffect(() => {
    const remembered = localStorage.getItem("ubumwe-admin-remember")
    if (remembered === "true") {
      setRememberDevice(true)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    // Check lockout
    if (lockedUntil && Date.now() < lockedUntil) {
      const remainingMin = Math.ceil((lockedUntil - Date.now()) / 60000)
      setError(`Account locked. Try again in ${remainingMin} minutes.`)
      return
    }

    if (!phone || !password) {
      setError("Phone and password are required")
      return
    }

    setLoading(true)
    setError(null)

    try {
      await login(phone, password)
      // Fetch the full user to check role
      await fetchUser()
      const user = useStore.getState().user

      if (!user) {
        throw new Error("Login failed — no user returned")
      }

      if (user.role !== "ADMIN" && user.role !== "STAFF" && user.role !== "MANAGER") {
        // Non-admin tried to access admin panel
        setError("Access Denied. Admin only.")
        // Logout the non-admin user
        await useStore.getState().logout()
        // Increment failed attempts
        const newAttempts = attempts + 1
        setAttempts(newAttempts)
        if (newAttempts >= MAX_ATTEMPTS) {
          const lockTime = Date.now() + LOCK_DURATION_MS
          setLockedUntil(lockTime)
          localStorage.setItem(LOCK_STORAGE_KEY, String(lockTime))
          setError(`Too many failed attempts. Account locked for 30 minutes.`)
        }
        return
      }

      // Success — admin logged in
      if (rememberDevice) {
        localStorage.setItem("ubumwe-admin-remember", "true")
      }
      setAttempts(0)
      toast({
        title: "Welcome, Admin! 🔐",
        description: `Logged in as ${user.name}`,
      })
      // The AdminView will re-render and show the dashboard
    } catch (err) {
      const newAttempts = attempts + 1
      setAttempts(newAttempts)

      if (newAttempts >= MAX_ATTEMPTS) {
        const lockTime = Date.now() + LOCK_DURATION_MS
        setLockedUntil(lockTime)
        localStorage.setItem(LOCK_STORAGE_KEY, String(lockTime))
        setError(`Too many failed attempts. Account locked for 30 minutes.`)
      } else {
        setError(
          `Invalid credentials. ${MAX_ATTEMPTS - newAttempts} attempt${MAX_ATTEMPTS - newAttempts !== 1 ? "s" : ""} remaining.`
        )
      }
    } finally {
      setLoading(false)
    }
  }

  // Show lockout screen
  if (lockedUntil && Date.now() < lockedUntil) {
    const remainingMin = Math.ceil((lockedUntil - Date.now()) / 60000)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-red-100">
            <Lock className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-red-900">Account Locked</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Too many failed login attempts.
            <br />
            Try again in <span className="font-semibold text-foreground">{remainingMin} minutes</span>.
          </p>
          <Button variant="outline" className="mt-6" onClick={onBack}>
            Back to store
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/20 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-primary shadow-lg">
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Ubumwe Beauty
          </h1>
          <p className="text-sm font-medium text-primary">Admin Control Panel</p>
        </div>

        {/* Login card */}
        <div className="rounded-2xl border bg-card p-6 shadow-lg sm:p-8">
          <div className="mb-6 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Admin Login</h2>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Attempt counter */}
          {attempts > 0 && !error && (
            <div className="mb-4 rounded-lg bg-amber-50 p-2 text-center">
              <p className="text-xs text-amber-700">
                Failed attempts: {attempts}/{MAX_ATTEMPTS}
              </p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Phone */}
            <div>
              <Label htmlFor="admin-phone" className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> Phone or Email
              </Label>
              <Input
                id="admin-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+250 780 000 000"
                className="mt-1"
                autoComplete="username"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="admin-password" className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" /> Password
              </Label>
              <div className="relative mt-1">
                <Input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="pr-10"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember device */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember-device"
                checked={rememberDevice}
                onCheckedChange={(v) => setRememberDevice(v === true)}
              />
              <Label htmlFor="remember-device" className="text-sm font-normal cursor-pointer">
                Remember this device for 30 days
              </Label>
            </div>

            {/* Login button */}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Shield className="mr-2 h-4 w-4" />
              )}
              {loading ? "Logging in..." : "Login to Admin Panel"}
              {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>

          {/* Forgot password */}
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                toast({
                  title: "Password Reset",
                  description: "Contact your super admin to reset your password.",
                })
              }}
              className="text-xs text-muted-foreground hover:text-primary"
            >
              Forgot Password?
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            Secure Admin Access Only
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            © {new Date().getFullYear()} Ubumwe Beauty. All rights reserved.
          </p>
          <button
            onClick={onBack}
            className="mt-3 text-xs font-medium text-primary hover:underline"
          >
            ← Back to store
          </button>
        </div>
      </div>
    </div>
  )
}
