'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, Lock, ShieldCheck, User } from 'lucide-react'
import { useStore } from '@/store/useStore'
import MFALoginChallenge from '@/components/auth/MFALoginChallenge'
import { useT } from '@/lib/i18n/LanguageContext'
import FormField from '@/components/a11y/FormField'

export default function LoginPage() {
  const router = useRouter()
  const t = useT()
  const setUser = useStore((state) => state.setUser)
  const [identifier, setIdentifier] = useState('+250')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mfaChallenge, setMfaChallenge] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError(null)
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: identifier.trim(), password }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || t('auth.login_failed'))
      if (data.mfaRequired && data.challengeToken) {
        setMfaChallenge(data.challengeToken)
        return
      }
      setUser(data.user)
      router.push(data.user.mustChangePassword ? '/change-password' : ['ADMIN', 'STAFF', 'MANAGER', 'SUPER_ADMIN'].includes(data.user.role) ? '/admin' : '/')
      router.refresh()
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('auth.unable_login')) }
    finally { setLoading(false) }
  }

  return (
    <main className="grid min-h-dvh bg-white lg:grid-cols-[0.9fr_1.1fr]">
      <section className="relative hidden overflow-hidden bg-[#1a1a1a] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-28 -top-28 h-96 w-96 rounded-full bg-[#B76E79]/30 blur-3xl" /><div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-[#FFD700]/10 blur-3xl" />
        <Link href="/" className="relative flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-full bg-[#B76E79] text-xl font-black">F</span><span><strong className="block text-lg">FreedomCosmeticShop</strong><span className="text-xs text-[#d999a3]">{t('auth.rwanda_beauty_freedom')}</span></span></Link>
        <div className="relative max-w-xl"><span className="text-xs font-black uppercase tracking-[0.22em] text-[#FFD700]">{t('auth.login_title')}</span><h1 className="mt-5 text-5xl font-black leading-tight">{t('auth.favourites_waiting')}</h1><p className="mt-5 max-w-lg text-base leading-7 text-gray-400">{t('auth.signin_benefits')}</p><div className="mt-8 grid gap-3 sm:grid-cols-2">{[t('auth.benefit_authentic'), t('auth.benefit_delivery'), t('auth.benefit_momo'), t('auth.benefit_secure')].map((item) => <span key={item} className="flex items-center gap-2 text-sm text-gray-300"><CheckCircle2 className="h-4 w-4 text-emerald-400" />{item}</span>)}</div></div>
        <p className="relative text-xs text-gray-500">{t('auth.trusted_kigali')}</p>
      </section>

      <section className="flex items-center justify-center bg-gradient-to-br from-white via-white to-rose-50/60 px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 flex min-h-11 items-center justify-center gap-3 lg:hidden"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#B76E79] font-black text-white">F</span><span><strong className="block text-base text-[#1a1a1a]">FreedomCosmeticShop</strong><span className="text-xs font-semibold text-[#B76E79]">{t('auth.rwanda_beauty_freedom')}</span></span></Link>
          <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-[0_20px_60px_rgba(26,26,26,0.08)] sm:p-8">
            {mfaChallenge ? <MFALoginChallenge challengeToken={mfaChallenge} onCancel={() => { setMfaChallenge(null); setPassword(''); setError(null) }} onSuccess={(authenticatedUser) => { const user = authenticatedUser as { role: string; mustChangePassword?: boolean }; setUser(authenticatedUser as never); router.push(user.mustChangePassword ? '/change-password' : ['ADMIN', 'STAFF', 'MANAGER', 'SUPER_ADMIN'].includes(user.role) ? '/admin' : '/'); router.refresh() }} /> : <>
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-[#B76E79]"><User className="h-5 w-5" /></span><h2 className="mt-5 text-center text-3xl font-black text-[#1a1a1a]">{t('auth.login_title')}</h2><p className="mt-2 text-center text-sm text-gray-500">{t('auth.login_rwanda_identifier')}</p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <FormField
                id="login-identifier"
                label={t('auth.phone_or_email')}
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="+250780000000 or you@email.com"
                autoComplete="username"
                required
              />
              <FormField
                id="login-password"
                label={t('auth.password')}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t('auth.password_placeholder')}
                autoComplete="current-password"
                required
                error={error || undefined}
                startAdornment={<Lock className="h-4 w-4 text-gray-500" />}
                labelExtra={<Link href="/forgot-password" className="inline-flex min-h-11 items-center text-sm font-bold text-[#B76E79] hover:underline">{t('auth.forgot_password')}</Link>}
                endAdornment={<button type="button" onClick={() => setShowPassword((value) => !value)} className="grid h-11 w-11 place-items-center rounded-full text-gray-600" aria-label={showPassword ? t('auth.hide_password') : t('auth.show_password')}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>}
              />
              <button type="submit" disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#B76E79] text-base font-black text-white shadow-lg shadow-[#B76E79]/20 hover:bg-[#a55d68] disabled:opacity-50">{loading ? <><Loader2 className="h-4 w-4 animate-spin" />{t('auth.logging_in')}</> : <>{t('auth.login_button')} <ArrowRight className="h-4 w-4" /></>}</button>
            </form>
            <p className="mt-5 text-center text-sm text-gray-500">{t('auth.new_customer')} <Link href="/register" className="inline-flex min-h-11 items-center font-black text-[#B76E79] hover:underline">{t('auth.register_link')}</Link></p><p className="mt-5 flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />{t('auth.secure_login')}</p>
            </>}
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-gray-500"><ShieldCheck className="h-4 w-4 text-emerald-600" /><strong className="text-gray-700">{t('auth.secure_shopping')}</strong><span>{t('auth.delivery_all_districts')}</span></div>
        </div>
      </section>
    </main>
  )
}
