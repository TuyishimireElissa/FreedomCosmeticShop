'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { ArrowLeft, Check, Eye, EyeOff, KeyRound, Loader2, Lock, MessageSquare, Phone } from 'lucide-react'
import { OTPInput } from '@/components/auth/OTPInput'
import { isValidRwandaPhone, normalizeRwandaPhone } from '@/lib/phone'
import { useStore } from '@/store/useStore'
import { useT } from '@/lib/i18n/LanguageContext'

export default function ForgotPasswordPage() {
  const router = useRouter(); const t = useT(); const setUser = useStore((state) => state.setUser)
  const [step, setStep] = useState<'phone' | 'reset' | 'done'>('phone')
  const [phone, setPhone] = useState('+250'); const [otp, setOtp] = useState(''); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false); const [devCode, setDevCode] = useState<string | null>(null); const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null)

  const sendOtp = async (event: FormEvent) => {
    event.preventDefault(); if (!isValidRwandaPhone(phone)) { setError(t('auth.invalid_phone')); return }
    setLoading(true); setError(null)
    try { const normalized = normalizeRwandaPhone(phone); const response = await fetch('/api/auth/forgot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: normalized }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || t('auth.otp_send_failed')); setPhone(normalized); setDevCode(data.code || null); setStep('reset') }
    catch (reason) { setError(reason instanceof Error ? reason.message : t('auth.otp_send_failed')) }
    finally { setLoading(false) }
  }

  const resetPassword = async (event: FormEvent) => {
    event.preventDefault(); if (otp.length !== 6) { setError(t('auth.complete_six_digit_otp')); return } if (password.length < 8) { setError(t('auth.new_password_8_chars')); return } if (password !== confirm) { setError(t('auth.passwords_no_match')); return }
    setLoading(true); setError(null)
    try { const response = await fetch('/api/auth/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, code: otp, newPassword: password }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || t('auth.password_reset_failed')); setUser(data.user); setStep('done'); window.setTimeout(() => { router.push('/'); router.refresh() }, 1800) }
    catch (reason) { setError(reason instanceof Error ? reason.message : t('auth.password_reset_failed')) }
    finally { setLoading(false) }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-gradient-to-br from-[#1a1a1a] via-[#2d2426] to-[#6f4249] px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-7 flex items-center justify-center gap-3 text-white"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#B76E79] font-black">F</span><span><strong className="block">FreedomCosmeticShop</strong><span className="text-xs text-[#e6a6b0]">{t('auth.rwanda_beauty_freedom')}</span></span></Link>
        <div className="rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8">
          {step === 'done' ? <div className="py-8 text-center"><span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Check className="h-9 w-9" /></span><h1 className="mt-5 text-2xl font-black text-[#1a1a1a]">{t('auth.password_updated')}</h1><p className="mt-2 text-sm text-gray-500">{t('auth.secure_signed_in')}</p><p className="mt-5 text-xs font-semibold text-[#B76E79]">{t('auth.returning_store')}</p></div> : <>
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-[#B76E79]">{step === 'phone' ? <KeyRound className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}</span><h1 className="mt-5 text-center text-2xl font-black text-[#1a1a1a]">{step === 'phone' ? t('auth.forgot_title') : t('auth.otp_title')}</h1><p className="mt-2 text-center text-sm leading-6 text-gray-500">{step === 'phone' ? t('auth.forgot_subtitle') : t('auth.otp_subtitle', { phone })}</p>
            {error && <div className="mt-5 rounded-xl bg-red-50 p-3 text-center text-sm font-semibold text-red-700">{error}</div>}
            {step === 'phone' ? <form onSubmit={sendOtp} className="mt-6 space-y-4"><label className="block"><span className="mb-1.5 block text-sm font-bold text-gray-700">{t('auth.rwanda_phone_label')}</span><div className="relative"><Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+250780000000" className="input-field pl-10" autoComplete="tel" /></div></label><button type="submit" disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#B76E79] text-base font-black text-white disabled:opacity-50">{loading ? <><Loader2 className="h-4 w-4 animate-spin" />{t('auth.sending_otp')}</> : <>{t('auth.forgot_send')} <MessageSquare className="h-4 w-4" /></>}</button><Link href="/login" className="flex items-center justify-center gap-1 min-h-11 text-sm font-bold text-gray-600"><ArrowLeft className="h-3.5 w-3.5" />{t('auth.back_to_login')}</Link></form> : <form onSubmit={resetPassword} className="mt-6 space-y-5">{devCode && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center"><p className="text-xs font-bold uppercase tracking-wider text-amber-700">{t('auth.development_otp')}</p><p className="mt-1 text-xl font-black tracking-[0.3em] text-amber-900">{devCode}</p></div>}<label className="block"><span className="mb-2 block text-center text-sm font-bold text-gray-700">{t('auth.six_digit_otp')}</span><OTPInput value={otp} onChange={setOtp} disabled={loading} /></label><PasswordField label={t('auth.new_password')} value={password} onChange={setPassword} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} /><PasswordField label={t('auth.confirm_new_password')} value={confirm} onChange={setConfirm} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} /><button type="submit" disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#B76E79] text-base font-black text-white disabled:opacity-50">{loading ? <><Loader2 className="h-4 w-4 animate-spin" />{t('auth.updating')}</> : <>{t('auth.reset_password')} <Lock className="h-4 w-4" /></>}</button><button type="button" onClick={() => { setStep('phone'); setOtp(''); setError(null) }} className="flex w-full items-center justify-center gap-1 min-h-11 text-sm font-bold text-gray-600"><ArrowLeft className="h-3.5 w-3.5" />{t('auth.use_another_phone')}</button></form>}
          </>}
        </div>
        <p className="mt-5 text-center text-xs text-white/70">{t('auth.otp_security_notice')}</p>
      </div>
    </main>
  )
}

function PasswordField({ label, value, onChange, visible, onToggle }: { label: string; value: string; onChange: (value: string) => void; visible: boolean; onToggle: () => void }) { const t = useT(); return <label className="block"><span className="mb-1.5 block text-sm font-bold text-gray-700">{label}</span><div className="relative"><Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input type={visible ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} placeholder={t('auth.password_hint')} className="input-field pl-10 pr-10" autoComplete="new-password" /><button type="button" onClick={onToggle} className="absolute right-0 top-1/2 grid h-11 w-11 -translate-y-1/2 touch-manipulation place-items-center rounded-full text-gray-500" aria-label={visible ? t('auth.hide_password') : t('auth.show_password')} title={visible ? t('auth.hide_password') : t('auth.show_password')}>{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label> }
