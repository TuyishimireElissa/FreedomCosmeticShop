"use client"

/**
 * AdminLoginView — dedicated admin login with security features.
 *
 * Features:
 *   - Phone + password login (uses existing /api/auth/login)
 *   - Show/hide password toggle
 *   - Wrong password counter (lock after 5 failed attempts)
 *   - 30-minute lockout with countdown
 *   - "Remember this device" checkbox (30 days)
 *   - Access denied message for non-admin users
 *   - "Secure Admin Access Only" branding
 *
 * This is a SEPARATE gate before AdminView renders.
 * It does NOT replace the existing LoginView for customers.
 */

import { useState, useEffect } from "react"
import { useStore } from "@/store/useStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import {
  Sparkles,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Shield,
  ArrowRight,
  Loader2,
  AlertCircle,
  Clock,
} from "lucide-react"

const MAX_ATTEMPTS = 5
const LOCK_DURATION_MS = 30 * 60 * 1000 // 30 minutes
const STORAGE_ATTEMPTS = "freedom-admin-attempts"
const STORAGE_LOCK = "freedom-admin-locked"
const STORAGE_REMEMBER = "freedom-admin-remember"

export function AdminLoginView() {
  const { login, user, goHome } = useStore()
  const { toast } = useToast()

  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberDevice, setRememberDevice] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Lockout state
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [lockdownRemaining, setLockdownRemaining] = useState(0)

  // Load lockout state on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_ATTEMPTS)
    if (stored) setFailedAttempts(Number(stored))

    const locked = localStorage.getItem(STORAGE_LOCK)
    if (locked) {
      const lockTime = Number(locked)
      if (lockTime > Date.now()) {
        setLockedUntil(lockTime)
      } else {
        // Lock expired — clear
        localStorage.removeItem(STORAGE_LOCK)
        localStorage.removeItem(STORAGE_ATTEMPTS)
        setFailedAttempts(0)
      }
    }

    // Check if device is remembered
    const remembered = localStorage.getItem(STORAGE_REMEMBER)
    if (remembered === "true") {
      setRememberDevice(true)
    }
  }, [])

  // Countdown timer for lockout
  useEffect(() => {
    if (!lockedUntil) return
    const update = () => {
      const remaining = lockedUntil - Date.now()
      if (remaining <= 0) {
        setLockedUntil(null)
        setLockdownRemaining(0)
        setFailedAttempts(0)
        localStorage.removeItem(STORAGE_LOCK)
        localStorage.removeItem(STORAGE_ATTEMPTS)
      } else {
        setLockdownRemaining(Math.ceil(remaining / 1000))
      }
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [lockedUntil])

  const formatRemaining = (seconds: number) => {
    const min = Math.floor(seconds / 60)
    const sec = seconds % 60
    return `${min} min ${sec} sec`
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    // Check lockout
    if (lockedUntil && lockedUntil > Date.now()) {
      setError("Account locked. Please wait for the timer to finish.")
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

      // Check if user is admin
      // The login function sets the user in store — we need to check role
      const currentUser = useStore.getState().user
      if (currentUser && (currentUser.role === "ADMIN" || currentUser.role === "MANAGER" || currentUser.role === "STAFF")) {
        // Success — reset attempts
        setFailedAttempts(0)
        localStorage.removeItem(STORAGE_ATTEMPTS)

        // Remember device
        if (rememberDevice) {
          localStorage.setItem(STORAGE_REMEMBER, "true")
        } else {
          localStorage.removeItem(STORAGE_REMEMBER)
        }

        // Set admin auth in store
        useStore.getState().setAdminAuthenticated(true)

        toast({
          title: "Welcome back, Admin! 🔐",
          description: "Logged in to admin panel successfully.",
        })
      } else {
        // User is not admin
        setError("Access Denied. Admin only.")
        toast({
          title: "Access Denied",
          description: "Your account does not have admin privileges.",
          variant: "destructive",
        })
        // Logout the non-admin user
        await useStore.getState().logout()
      }
    } catch (err) {
      // Failed login — increment attempts
      const newAttempts = failedAttempts + 1
      setFailedAttempts(newAttempts)
      localStorage.setItem(STORAGE_ATTEMPTS, String(newAttempts))

      if (newAttempts >= MAX_ATTEMPTS) {
        // Lock account
        const lockUntil = Date.now() + LOCK_DURATION_MS
        setLockedUntil(lockUntil)
        localStorage.setItem(STORAGE_LOCK, String(lockUntil))
        setError(`Too many failed attempts. Account locked for 30 minutes.`)
      } else {
        const remaining = MAX_ATTEMPTS - newAttempts
        setError(
          err instanceof Error
            ? `${err.message} (${remaining} attempt${remaining !== 1 ? "s" : ""} remaining)`
            : `Login failed. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`
        )
      }
    } finally {
      setLoading(false)
    }
  }

  // If locked, show lockout screen
  if (lockedUntil && lockdownRemaining > 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-foreground px-4">
        <div className="w-full max-w-md rounded-2xl bg-card p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-red-100">
            <Lock className="h-10 w-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Account Locked</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Too many failed login attempts. For security, your admin access has been locked.
          </p>
          <div className="mt-6 rounded-xl bg-secondary p-4">
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="font-mono text-2xl font-bold text-primary">
                {formatRemaining(lockdownRemaining)}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Time remaining until unlock</p>
          </div>
          <Button
            variant="outline"
            className="mt-6 w-full"
            onClick={goHome}
          >
            Back to Homepage
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-foreground px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-primary">
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-background">
            FreedomCosmeticShop
          </h1>
          <p className="text-sm text-background/60">Admin Control Panel</p>
        </div>

        {/* Login card */}
        <div className="rounded-2xl bg-card p-8 shadow-2xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Admin Login</h2>
            <p className="text-xs text-muted-foreground">Secure admin access only</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Failed attempts warning */}
          {failedAttempts > 0 && failedAttempts < MAX_ATTEMPTS && !error && (
            <div className="mb-4 rounded-lg bg-amber-50 p-3">
              <p className="text-center text-xs text-amber-700">
                ⚠️ {MAX_ATTEMPTS - failedAttempts} attempt{MAX_ATTEMPTS - failedAttempts !== 1 ? "s" : ""} remaining before lockout
              </p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Phone */}
            <div>
              <Label htmlFor="admin-phone" className="text-sm font-medium">
                Phone or Email
              </Label>
              <div className="relative mt-1">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="admin-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+250 780 000 000"
                  className="h-11 pl-9"
                  autoComplete="username"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="admin-password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative mt-1">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="h-11 pl-9 pr-9"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
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
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Login to Admin Panel
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Forgot password */}
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                toast({
                  title: "Password Reset",
                  description: "Contact the super admin to reset your password.",
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
          <p className="flex items-center justify-center gap-1.5 text-xs text-background/60">
            <Lock className="h-3 w-3" />
            Secure Admin Access Only
          </p>
          <p className="mt-1 text-xs text-background/40">
            © {new Date().getFullYear()} FreedomCosmeticShop Rwanda
          </p>
          <button
            onClick={goHome}
            className="mt-3 text-xs text-background/60 hover:text-background"
          >
            ← Back to Homepage
          </button>
        </div>
      </div>
    </div>
  )
}
