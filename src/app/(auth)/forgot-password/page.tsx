'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { ArrowLeft, Check, Eye, EyeOff, KeyRound, Loader2, Lock, MessageSquare, Phone } from 'lucide-react'
import { OTPInput } from '@/components/auth/OTPInput'
import { isValidRwandaPhone, normalizeRwandaPhone } from '@/lib/phone'
import { useStore } from '@/store/useStore'

export default function ForgotPasswordPage() {
  const router = useRouter(); const setUser = useStore((state) => state.setUser)
  const [step, setStep] = useState<'phone' | 'reset' | 'done'>('phone')
  const [phone, setPhone] = useState('+250'); const [otp, setOtp] = useState(''); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false); const [devCode, setDevCode] = useState<string | null>(null); const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null)

  const sendOtp = async (event: FormEvent) => {
    event.preventDefault(); if (!isValidRwandaPhone(phone)) { setError('Enter a valid +250 Rwanda mobile number'); return }
    setLoading(true); setError(null)
    try { const normalized = normalizeRwandaPhone(phone); const response = await fetch('/api/auth/forgot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: normalized }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not send OTP'); setPhone(normalized); setDevCode(data.code || null); setStep('reset') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not send OTP') }
    finally { setLoading(false) }
  }

  const resetPassword = async (event: FormEvent) => {
    event.preventDefault(); if (otp.length !== 6) { setError('Enter the complete six-digit OTP'); return } if (password.length < 8) { setError('New password must contain at least 8 characters'); return } if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true); setError(null)
    try { const response = await fetch('/api/auth/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, code: otp, newPassword: password }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Password reset failed'); setUser(data.user); setStep('done'); window.setTimeout(() => { router.push('/'); router.refresh() }, 1800) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Password reset failed') }
    finally { setLoading(false) }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-gradient-to-br from-[#1a1a1a] via-[#2d2426] to-[#6f4249] px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-7 flex items-center justify-center gap-3 text-white"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#B76E79] font-black">F</span><span><strong className="block">FreedomCosmeticShop</strong><span className="text-[10px] text-[#e6a6b0]">Rwanda&apos;s Beauty Freedom 🇷🇼</span></span></Link>
        <div className="rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8">
          {step === 'done' ? <div className="py-8 text-center"><span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Check className="h-9 w-9" /></span><h1 className="mt-5 text-2xl font-black text-[#1a1a1a]">Password updated</h1><p className="mt-2 text-sm text-gray-500">Your account is secure and you are now signed in.</p><p className="mt-5 text-xs font-semibold text-[#B76E79]">Taking you back to the store…</p></div> : <>
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-[#B76E79]">{step === 'phone' ? <KeyRound className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}</span><h1 className="mt-5 text-center text-2xl font-black text-[#1a1a1a]">{step === 'phone' ? 'Forgot your password?' : 'Verify and reset'}</h1><p className="mt-2 text-center text-sm leading-6 text-gray-500">{step === 'phone' ? 'Enter your Rwanda phone number and we’ll send a secure OTP.' : `Enter the OTP sent to ${phone}, then choose a new password.`}</p>
            {error && <div className="mt-5 rounded-xl bg-red-50 p-3 text-center text-sm font-semibold text-red-700">{error}</div>}
            {step === 'phone' ? <form onSubmit={sendOtp} className="mt-6 space-y-4"><label className="block"><span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-gray-500">Rwanda phone (+250)</span><div className="relative"><Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+250780000000" className="input-field pl-10" autoComplete="tel" /></div></label><button type="submit" disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#B76E79] text-sm font-black text-white disabled:opacity-50">{loading ? <><Loader2 className="h-4 w-4 animate-spin" />Sending OTP…</> : <>Send OTP <MessageSquare className="h-4 w-4" /></>}</button><Link href="/login" className="flex items-center justify-center gap-1 text-xs font-bold text-gray-500"><ArrowLeft className="h-3.5 w-3.5" />Back to login</Link></form> : <form onSubmit={resetPassword} className="mt-6 space-y-5">{devCode && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center"><p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Development OTP</p><p className="mt-1 text-xl font-black tracking-[0.3em] text-amber-900">{devCode}</p></div>}<label className="block"><span className="mb-2 block text-center text-xs font-black uppercase tracking-wider text-gray-500">Six-digit OTP</span><OTPInput value={otp} onChange={setOtp} disabled={loading} /></label><PasswordField label="New password" value={password} onChange={setPassword} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} /><PasswordField label="Confirm new password" value={confirm} onChange={setConfirm} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} /><button type="submit" disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#B76E79] text-sm font-black text-white disabled:opacity-50">{loading ? <><Loader2 className="h-4 w-4 animate-spin" />Updating…</> : <>Reset password <Lock className="h-4 w-4" /></>}</button><button type="button" onClick={() => { setStep('phone'); setOtp(''); setError(null) }} className="flex w-full items-center justify-center gap-1 text-xs font-bold text-gray-500"><ArrowLeft className="h-3.5 w-3.5" />Use another phone</button></form>}
          </>}
        </div>
        <p className="mt-5 text-center text-[10px] text-white/50">OTP codes expire automatically. Never share your code or password.</p>
      </div>
    </main>
  )
}

function PasswordField({ label, value, onChange, visible, onToggle }: { label: string; value: string; onChange: (value: string) => void; visible: boolean; onToggle: () => void }) { return <label className="block"><span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-gray-500">{label}</span><div className="relative"><Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input type={visible ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} placeholder="At least 8 characters" className="input-field pl-10 pr-10" autoComplete="new-password" /><button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label> }
