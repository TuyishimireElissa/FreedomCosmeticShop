"use client"

/**
 * LoginView — two login modes + password reset flow.
 *
 * Modes:
 *   1. "password" — phone + password (default)
 *   2. "otp" — phone → OTP → verify (passwordless)
 *
 * Password reset flow:
 *   - Click "Forgot password?" → enters phone → OTP sent
 *   - Enter OTP + new password → reset complete
 *
 * Features:
 *   - Toggle between password and OTP login
 *   - Password visibility toggle
 *   - Shows OTP code in dev mode
 *   - Resend OTP with countdown
 *   - Toggle to register view
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
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  KeyRound,
  MessageSquare,
} from "lucide-react"
import { useT } from '@/lib/i18n/LanguageContext'

type Mode = "password" | "otp" | "forgot"

export function LoginView() {
  const t = useT()
  const { goHome, goCatalog, setUser, setView } = useStore()
  const { toast } = useToast()

  const [mode, setMode] = useState<Mode>("password")

  // Form fields
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [otpCode, setOtpCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)

  // Dev hint
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null)
  const [resendCountdown, setResendCountdown] = useState(0)

  // State
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Resend countdown
  useEffect(() => {
    if (resendCountdown <= 0) return
    const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCountdown])

  // ─── Login with password ────────────────────────────────────────────
  const handlePasswordLogin = async (ev: FormEvent) => {
    ev.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || t('auth.login_failed'))
        return
      }
      setUser(data.user)
      toast({ title: t('auth.welcome_back_flower'), description: data.message })
      goCatalog(null)
    } catch {
      setError(t('errors.network_error'))
    } finally {
      setLoading(false)
    }
  }

  // ─── Send OTP for OTP login ─────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!phone) {
      setError(t('auth.enter_phone'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/verify-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || t('auth.code_send_failed'))
        return
      }
      setResendCountdown(30)
      if (data.code) setDevOtpHint(data.code)
      toast({ title: t('auth.code_sent'), description: t('auth.check_phone') })
    } catch {
      setError(t('errors.network_error'))
    } finally {
      setLoading(false)
    }
  }

  // ─── Verify OTP login ───────────────────────────────────────────────
  const handleVerifyOtp = async (code: string) => {
    if (code.length !== 6) return
    setLoading(true)
    try {
      const res = await fetch("/api/auth/verify-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || t('auth.verification_failed'))
        setOtpCode("")
        return
      }
      setUser(data.user)
      toast({ title: t('auth.welcome_back_flower') })
      goCatalog(null)
    } catch {
      setError(t('errors.network_error'))
    } finally {
      setLoading(false)
    }
  }

  // ─── Forgot password: send OTP ──────────────────────────────────────
  const handleForgotSendOtp = async (ev: FormEvent) => {
    ev.preventDefault()
    if (!phone) {
      setError(t('auth.enter_phone'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || t('auth.failed'))
        return
      }
      setMode("forgot")
      setResendCountdown(30)
      if (data.code) setDevOtpHint(data.code)
      toast({ title: t('auth.code_sent'), description: t('auth.check_phone') })
    } catch {
      setError(t('errors.network_error'))
    } finally {
      setLoading(false)
    }
  }

  // ─── Reset password ─────────────────────────────────────────────────
  const handleResetPassword = async () => {
    if (otpCode.length !== 6) {
      setError(t('auth.enter_six_digit_code'))
      return
    }
    if (newPassword.length < 8) {
      setError(t('auth.weak_password'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otpCode, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || t('auth.reset_failed'))
        setOtpCode("")
        return
      }
      setUser(data.user)
      toast({ title: t('auth.password_reset_flower'), description: t('auth.now_logged_in') })
      goCatalog(null)
    } catch {
      setError(t('errors.network_error'))
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
        {/* Mode tabs (only show on initial screen) */}
        {mode === "password" || mode === "otp" ? (
          <div className="mb-6 flex rounded-lg bg-secondary p-1">
            <button
              onClick={() => {
                setMode("password")
                setError(null)
                setOtpCode("")
                setDevOtpHint(null)
              }}
              className={`flex flex-1 items-center justify-center gap-1.5 min-h-11 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                mode === "password" ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              <KeyRound className="h-4 w-4" /> {t('auth.password')}
            </button>
            <button
              onClick={() => {
                setMode("otp")
                setError(null)
                setOtpCode("")
                setDevOtpHint(null)
              }}
              className={`flex flex-1 items-center justify-center gap-1.5 min-h-11 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                mode === "otp" ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              <MessageSquare className="h-4 w-4" /> {t('auth.otp_label')}
            </button>
          </div>
        ) : null}

        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* ─── Password Login ─────────────────────────────────────── */}
        {mode === "password" && (
          <>
            <h1 className="text-2xl font-bold">{t('auth.login_title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('auth.login_phone_password')}
            </p>

            <form onSubmit={handlePasswordLogin} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="login-phone">{t('auth.phone')}</Label>
                <div className="relative mt-1">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="login-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0788123456"
                    className="pl-9"
                    autoComplete="tel"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password">{t('auth.password')}</Label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot")
                      setError(null)
                      setOtpCode("")
                      setNewPassword("")
                      setDevOtpHint(null)
                    }}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {t('auth.forgot_password')}
                  </button>
                </div>
                <div className="relative mt-1">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth.password_placeholder')}
                    className="pl-9 pr-9"
                    autoComplete="current-password"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-0 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? t('auth.hide_password') : t('auth.show_password')}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" size="lg" className="min-h-12 w-full text-base" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {t('auth.login_button')} <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </>
        )}

        {/* ─── OTP Login ──────────────────────────────────────────── */}
        {mode === "otp" && (
          <>
            <h1 className="text-2xl font-bold">{t('auth.login_otp')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('auth.otp_login_hint')}
            </p>

            {!devOtpHint ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSendOtp()
                }}
                className="mt-6 space-y-4"
              >
                <div>
                  <Label htmlFor="otp-phone">{t('auth.phone')}</Label>
                  <div className="relative mt-1">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="otp-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0788123456"
                      className="pl-9"
                      autoComplete="tel"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" size="lg" className="min-h-12 w-full text-base" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('auth.send_code')}
                </Button>
              </form>
            ) : (
              <>
                <p className="mt-4 text-sm text-muted-foreground">
                  {t('auth.code_sent_to')} <span className="font-medium text-foreground">{phone}</span>
                </p>
                {devOtpHint && (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
                    <p className="text-xs font-medium text-amber-700">{t('auth.dev_mode_sms_disabled')}</p>
                    <p className="mt-1 text-2xl font-bold tracking-[0.3em] text-amber-900">
                      {devOtpHint}
                    </p>
                  </div>
                )}
                <div className="mt-6">
                  <OTPInput
                    value={otpCode}
                    onChange={setOtpCode}
                    onComplete={handleVerifyOtp}
                    disabled={loading}
                  />
                </div>
                <div className="mt-6 flex items-center justify-between text-sm">
                  <button
                    onClick={() => {
                      setDevOtpHint(null)
                      setOtpCode("")
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ← {t('auth.change_phone')}
                  </button>
                  <button
                    onClick={handleSendOtp}
                    disabled={resendCountdown > 0 || loading}
                    className="font-medium text-primary hover:underline disabled:opacity-50"
                  >
                    {resendCountdown > 0 ? t('auth.otp_resend_in', { seconds: resendCountdown }) : t('auth.otp_resend')}
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* ─── Forgot Password ────────────────────────────────────── */}
        {mode === "forgot" && (
          <>
            <h1 className="text-2xl font-bold">{t('auth.reset_password')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('auth.reset_instructions')}
            </p>

            {!devOtpHint ? (
              <form onSubmit={handleForgotSendOtp} className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="forgot-phone">{t('auth.phone')}</Label>
                  <div className="relative mt-1">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="forgot-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0788123456"
                      className="pl-9"
                      autoComplete="tel"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" size="lg" className="min-h-12 w-full text-base" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('auth.forgot_send')}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("password")
                    setError(null)
                  }}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
                >
                  ← {t('auth.back_to_login')}
                </button>
              </form>
            ) : (
              <div className="mt-6 space-y-4">
                {devOtpHint && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
                    <p className="text-xs font-medium text-amber-700">{t('auth.dev_mode_sms_disabled')}</p>
                    <p className="mt-1 text-2xl font-bold tracking-[0.3em] text-amber-900">
                      {devOtpHint}
                    </p>
                  </div>
                )}
                <div>
                  <Label>{t('auth.otp_verify')}</Label>
                  <div className="mt-2">
                    <OTPInput value={otpCode} onChange={setOtpCode} disabled={loading} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="new-password">{t('auth.new_password')}</Label>
                  <div className="relative mt-1">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t('auth.password_hint')}
                      className="pl-9 pr-9"
                      autoComplete="new-password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((s) => !s)}
                      className="absolute right-0 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button size="lg" className="min-h-12 w-full text-base" disabled={loading} onClick={handleResetPassword}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('auth.reset_and_login')}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t('auth.no_account')} {" "}
        <button
          onClick={() => setView("register")}
          className="font-medium text-primary hover:underline"
        >
          {t('auth.register_link')}
        </button>
      </p>
    </div>
  )
}
