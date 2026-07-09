"use client"

/**
 * RegisterView — two-step registration flow.
 *
 * Step 1: Phone + Name + Password + optional Email
 *   → POST /api/auth/register → OTP sent
 * Step 2: OTP verification (6-digit code)
 *   → POST /api/auth/verify → account created, logged in
 *
 * Features:
 *   - Client-side validation (phone format, password strength)
 *   - Shows OTP code in dev mode (when SMS is disabled)
 *   - Resend OTP with countdown timer
 *   - Password visibility toggle
 *   - Toggle to login view
 *   - Error display
 */

import { useState, useEffect, type FormEvent } from "react"
import { useStore } from "@/store/useStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { OTPInput } from "./OTPInput"
import { useToast } from "@/hooks/use-toast"
import {
  Sparkles,
  Phone,
  User as UserIcon,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  Loader2,
  ShieldCheck,
} from "lucide-react"

type Step = "form" | "otp"

export function RegisterView() {
  const { goHome, goCatalog, setUser } = useStore()
  const { toast } = useToast()

  // Step management
  const [step, setStep] = useState<Step>("form")

  // Form fields
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  // OTP
  const [otpCode, setOtpCode] = useState("")
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null)
  const [resendCountdown, setResendCountdown] = useState(0)

  // State
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Resend countdown
  useEffect(() => {
    if (resendCountdown <= 0) return
    const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCountdown])

  // ─── Validation ─────────────────────────────────────────────────────
  const validateForm = (): boolean => {
    const e: Record<string, string> = {}
    if (name.trim().length < 2) e.name = "Please enter your full name"
    if (!/^(?:\+250|0)?7[2389][0-9]{7}$/.test(phone.replace(/[\s-]/g, "")))
      e.phone = "Enter a valid Rwandan phone (e.g. 0788123456)"
    if (password.length < 8) e.password = "Password must be at least 8 characters"
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = "Enter a valid email or leave blank"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ─── Step 1: Submit registration form ───────────────────────────────
  const handleSubmitForm = async (ev: FormEvent) => {
    ev.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    setErrors({})
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email: email || undefined, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setErrors({ form: data.error || "Registration failed" })
        return
      }

      // Move to OTP step
      setStep("otp")
      setResendCountdown(30) // 30-second cooldown for resend
      if (data.code) {
        setDevOtpHint(data.code) // Dev mode: show the OTP code
      }
      toast({
        title: "Code sent",
        description: "Enter the 6-digit code we sent to your phone.",
      })
    } catch {
      setErrors({ form: "Network error. Please try again." })
    } finally {
      setLoading(false)
    }
  }

  // ─── Step 2: Verify OTP ─────────────────────────────────────────────
  const handleVerify = async (code: string) => {
    if (code.length !== 6) return
    setLoading(true)
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast({
          title: "Verification failed",
          description: data.error,
          variant: "destructive",
        })
        setOtpCode("") // Clear for retry
        return
      }

      // Success — user is logged in
      setUser(data.user)
      toast({
        title: "Welcome to FreedomCosmeticShop! 🌸",
        description: "Your account has been created.",
      })
      goCatalog(null)
    } catch {
      toast({
        title: "Network error",
        description: "Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // ─── Resend OTP ─────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCountdown > 0) return
    setLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email: email || undefined, password }),
      })
      const data = await res.json()
      if (res.ok) {
        setResendCountdown(30)
        if (data.code) setDevOtpHint(data.code)
        toast({ title: "Code resent", description: "Check your phone." })
      } else {
        toast({ title: "Failed", description: data.error, variant: "destructive" })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-8">
      {/* Logo */}
      <button onClick={goHome} className="mb-6 flex items-center justify-center gap-2">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="h-5 w-5" />
        </span>
        <span className="text-xl font-semibold">
          FreedomCosmeticShop
        </span>
      </button>

      <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        {step === "form" ? (
          <>
            <h1 className="text-2xl font-bold">Create your account</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Join FreedomCosmeticShop for faster checkout and order tracking.
            </p>

            <form onSubmit={handleSubmitForm} className="mt-6 space-y-4">
              {errors.form && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {errors.form}
                </div>
              )}

              {/* Name */}
              <div>
                <Label htmlFor="reg-name">Full name *</Label>
                <div className="relative mt-1">
                  <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="reg-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Aline Mugisha"
                    className="pl-9"
                    autoComplete="name"
                    disabled={loading}
                  />
                </div>
                {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
              </div>

              {/* Phone */}
              <div>
                <Label htmlFor="reg-phone">Phone number *</Label>
                <div className="relative mt-1">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="reg-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0788123456"
                    className="pl-9"
                    autoComplete="tel"
                    disabled={loading}
                  />
                </div>
                {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  We&apos;ll send a verification code via SMS.
                </p>
              </div>

              {/* Email (optional) */}
              <div>
                <Label htmlFor="reg-email">Email (optional)</Label>
                <div className="relative mt-1">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-9"
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <Label htmlFor="reg-password">Password *</Label>
                <div className="relative mt-1">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="pl-9 pr-9"
                    autoComplete="new-password"
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
                {errors.password && (
                  <p className="mt-1 text-xs text-destructive">{errors.password}</p>
                )}
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending code...
                  </>
                ) : (
                  <>
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Your password is securely hashed. We never store it in plain text.
            </p>
          </>
        ) : (
          // ─── OTP Step ──────────────────────────────────────────────
          <>
            <button
              onClick={() => {
                setStep("form")
                setOtpCode("")
                setDevOtpHint(null)
              }}
              className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            <h1 className="text-2xl font-bold">Verify your phone</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter the 6-digit code we sent to{" "}
              <span className="font-medium text-foreground">{phone}</span>
            </p>

            {devOtpHint && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
                <p className="text-xs font-medium text-amber-700">
                  Dev mode (SMS disabled)
                </p>
                <p className="mt-1 text-2xl font-bold tracking-[0.3em] text-amber-900">
                  {devOtpHint}
                </p>
              </div>
            )}

            <div className="mt-6">
              <OTPInput
                value={otpCode}
                onChange={setOtpCode}
                onComplete={handleVerify}
                disabled={loading}
              />
            </div>

            <div className="mt-6 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Didn&apos;t receive a code?</span>
              <button
                onClick={handleResend}
                disabled={resendCountdown > 0 || loading}
                className="font-medium text-primary hover:underline disabled:opacity-50"
              >
                {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend code"}
              </button>
            </div>

            {loading && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Verifying...
              </div>
            )}
          </>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <button
          onClick={() => useStore.getState().setView("login")}
          className="font-medium text-primary hover:underline"
        >
          Log in
        </button>
      </p>
    </div>
  )
}
