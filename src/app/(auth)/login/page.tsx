'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, Lock, ShieldCheck, User } from 'lucide-react'
import { useStore } from '@/store/useStore'

export default function LoginPage() {
  const router = useRouter()
  const setUser = useStore((state) => state.setUser)
  const [identifier, setIdentifier] = useState('+250')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError(null)
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: identifier.trim(), password }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Login failed')
      setUser(data.user)
      router.push(data.user.role === 'ADMIN' || data.user.role === 'STAFF' ? '/admin' : '/')
      router.refresh()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to log in') }
    finally { setLoading(false) }
  }

  return (
    <main className="grid min-h-dvh bg-white lg:grid-cols-[0.9fr_1.1fr]">
      <section className="relative hidden overflow-hidden bg-[#1a1a1a] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-28 -top-28 h-96 w-96 rounded-full bg-[#B76E79]/30 blur-3xl" /><div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-[#FFD700]/10 blur-3xl" />
        <Link href="/" className="relative flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-full bg-[#B76E79] text-xl font-black">F</span><span><strong className="block text-lg">FreedomCosmeticShop</strong><span className="text-xs text-[#d999a3]">Rwanda&apos;s Beauty Freedom 🇷🇼</span></span></Link>
        <div className="relative max-w-xl"><span className="text-[11px] font-black uppercase tracking-[0.22em] text-[#FFD700]">Welcome back</span><h1 className="mt-5 text-5xl font-black leading-tight">Your beauty favourites are waiting.</h1><p className="mt-5 max-w-lg text-base leading-7 text-gray-400">Sign in for faster checkout, loyalty rewards, saved addresses and order tracking across Rwanda.</p><div className="mt-8 grid gap-3 sm:grid-cols-2">{['100% authentic products','Delivery to all 30 districts','MTN MoMo payments','Secure customer account'].map((item) => <span key={item} className="flex items-center gap-2 text-sm text-gray-300"><CheckCircle2 className="h-4 w-4 text-emerald-400" />{item}</span>)}</div></div>
        <p className="relative text-xs text-gray-500">Trusted beauty shopping, proudly based in Kigali.</p>
      </section>

      <section className="flex items-center justify-center bg-gradient-to-br from-white via-white to-rose-50/60 px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 flex items-center justify-center gap-3 lg:hidden"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#B76E79] font-black text-white">F</span><span><strong className="block text-base text-[#1a1a1a]">FreedomCosmeticShop</strong><span className="text-[10px] font-semibold text-[#B76E79]">Rwanda&apos;s Beauty Freedom 🇷🇼</span></span></Link>
          <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-[0_20px_60px_rgba(26,26,26,0.08)] sm:p-8">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-[#B76E79]"><User className="h-5 w-5" /></span><h2 className="mt-5 text-center text-3xl font-black text-[#1a1a1a]">Welcome back</h2><p className="mt-2 text-center text-sm text-gray-500">Log in with your Rwanda phone number or email.</p>
            {error && <div className="mt-5 rounded-xl bg-red-50 p-3 text-center text-sm font-semibold text-red-700">{error}</div>}
            <form onSubmit={submit} className="mt-6 space-y-4">
              <label className="block"><span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-gray-500">Phone or email</span><input value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="+250780000000 or you@email.com" autoComplete="username" className="input-field" required /></label>
              <label className="block"><span className="mb-1.5 flex items-center justify-between text-xs font-black uppercase tracking-wider text-gray-500">Password<Link href="/forgot-password" className="normal-case tracking-normal text-[#B76E79] hover:underline">Forgot password?</Link></span><div className="relative"><Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" autoComplete="current-password" className="input-field pl-10 pr-11" required /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>
              <button type="submit" disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#B76E79] text-sm font-black text-white shadow-lg shadow-[#B76E79]/20 hover:bg-[#a55d68] disabled:opacity-50">{loading ? <><Loader2 className="h-4 w-4 animate-spin" />Signing in…</> : <>Log in <ArrowRight className="h-4 w-4" /></>}</button>
            </form>
            <p className="mt-5 text-center text-sm text-gray-500">New to FreedomCosmeticShop? <Link href="/register" className="font-black text-[#B76E79] hover:underline">Create an account</Link></p><p className="mt-5 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-gray-400"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />Secure encrypted login</p>
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-gray-500"><ShieldCheck className="h-4 w-4 text-emerald-600" /><strong className="text-gray-700">Secure shopping</strong><span>with delivery across all 30 districts</span></div>
        </div>
      </section>
    </main>
  )
}
