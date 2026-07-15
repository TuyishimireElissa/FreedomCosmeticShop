'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, Lock, ShieldCheck, Sparkles } from 'lucide-react'
import { OTPInput } from '@/components/auth/OTPInput'
import { isValidRwandaPhone, normalizeRwandaPhone } from '@/lib/phone'
import { useStore } from '@/store/useStore'
import { useT } from '@/lib/i18n/LanguageContext'

const skinTypes = ['OILY', 'DRY', 'COMBINATION', 'SENSITIVE', 'NORMAL', 'NOT_SURE'] as const

export default function RegisterPage() {
  const router = useRouter(); const t = useT(); const setUser = useStore((state) => state.setUser)
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [form, setForm] = useState({ name: '', phone: '+250', email: '', password: '', confirm: '', skinType: '', terms: false })
  const [showPassword, setShowPassword] = useState(false); const [otp, setOtp] = useState(''); const [devCode, setDevCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null)
  const update = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }))

  const validate = () => {
    if (form.name.trim().length < 2) return t('auth.enter_full_name')
    if (!isValidRwandaPhone(form.phone)) return t('auth.rwanda_phone_format')
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return t('auth.valid_email_optional')
    if (form.password.length < 8) return t('auth.password_8_chars')
    if (form.password !== form.confirm) return t('auth.passwords_no_match')
    if (!form.skinType) return t('auth.select_skin_type')
    if (!form.terms) return t('auth.accept_terms_privacy')
    return null
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault(); const validation = validate(); if (validation) { setError(validation); return }
    setLoading(true); setError(null)
    try {
      const phone = normalizeRwandaPhone(form.phone)
      const response = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name.trim(), phone, email: form.email.trim() || undefined, password: form.password, skinType: form.skinType }) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error || t('auth.registration_failed'))
      setForm((current) => ({ ...current, phone })); setDevCode(data.code || null); setStep('otp')
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('auth.registration_failed')) }
    finally { setLoading(false) }
  }

  const verify = async (code: string) => {
    if (code.length !== 6) return
    setLoading(true); setError(null)
    try {
      const response = await fetch('/api/auth/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: form.phone, code }) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error || t('auth.verification_failed'))
      localStorage.setItem('freedom-skin-type', form.skinType); setUser(data.user); router.push('/'); router.refresh()
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('auth.verification_failed')); setOtp('') }
    finally { setLoading(false) }
  }

  return (
    <main className="min-h-dvh bg-gradient-to-br from-rose-50 via-white to-[#fff8e7] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="mb-7 flex min-h-11 items-center justify-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-full bg-[#B76E79] text-lg font-black text-white">F</span><span><strong className="block text-lg text-[#1a1a1a]">FreedomCosmeticShop</strong><span className="text-xs font-semibold text-[#B76E79]">{t('auth.rwanda_beauty_freedom')}</span></span></Link>
        <div className="overflow-hidden rounded-[2rem] border border-white bg-white shadow-[0_24px_70px_rgba(26,26,26,0.1)]">
          <div className="bg-[#1a1a1a] px-6 py-7 text-center text-white sm:px-9"><span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-[#B76E79]"><Sparkles className="h-5 w-5" /></span><h1 className="mt-4 text-2xl font-black sm:text-3xl">{step === 'form' ? t('auth.register_title') : t('auth.otp_title')}</h1><p className="mt-2 text-sm text-gray-400">{step === 'form' ? t('auth.register_benefits') : t('auth.enter_code_phone', { phone: form.phone })}</p></div>
          <div className="p-5 sm:p-8">
            {error && <div className="mb-5 rounded-xl bg-red-50 p-3 text-center text-sm font-semibold text-red-700">{error}</div>}
            {step === 'form' ? <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2"><Field label={t('auth.full_name')}><input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Aline Uwase" autoComplete="name" className="input-field" /></Field><Field label={t('auth.rwanda_phone_label')}><input type="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="+250780000000" autoComplete="tel" className="input-field" /></Field></div>
              <Field label={t('auth.email_optional')}><input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="you@example.com" autoComplete="email" className="input-field" /></Field>
              <div className="grid gap-4 sm:grid-cols-2"><Field label={t('auth.password')}><Password value={form.password} onChange={(value) => update('password', value)} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} /></Field><Field label={t('auth.confirm_password')}><Password value={form.confirm} onChange={(value) => update('confirm', value)} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} /></Field></div>
              <Field label={t('auth.skin_type_label')}><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{skinTypes.map((type) => <button key={type} type="button" onClick={() => update('skinType', type)} className={`min-h-11 rounded-xl border px-3 py-2.5 text-xs font-bold ${form.skinType === type ? 'border-[#B76E79] bg-rose-50 text-[#B76E79]' : 'border-gray-200 text-gray-600 hover:border-rose-200'}`}>{type === 'NOT_SURE' ? t('auth.not_sure') : t(`skin_types.${type}`)}</button>)}</div></Field>
              <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl bg-[#f8f9fa] p-3"><input type="checkbox" checked={form.terms} onChange={(event) => update('terms', event.target.checked)} className="mt-0.5 h-5 w-5 rounded border-gray-300 text-[#B76E79] focus:ring-[#B76E79]" /><span className="text-sm leading-6 text-gray-600">{t('auth.terms_agree')} <Link href="/terms" className="font-bold text-[#B76E79]">{t('auth.terms_link')}</Link> {t('common.and')} <Link href="/privacy" className="font-bold text-[#B76E79]">{t('auth.privacy_policy')}</Link>.</span></label>
              <button type="submit" disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#B76E79] text-base font-black text-white shadow-lg shadow-rose-100 disabled:opacity-50">{loading ? <><Loader2 className="h-4 w-4 animate-spin" />{t('auth.sending_otp')}</> : <>{t('auth.register_button')} <ArrowRight className="h-4 w-4" /></>}</button>
              <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />{t('auth.password_hashed')}</p>
            </form> : <div className="py-4 text-center"><button type="button" onClick={() => { setStep('form'); setOtp(''); setError(null) }} className="mb-6 inline-flex items-center gap-1 min-h-11 text-sm font-bold text-gray-600"><ArrowLeft className="h-3.5 w-3.5" />{t('auth.edit_details')}</button>{devCode && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3"><p className="text-xs font-bold uppercase tracking-wider text-amber-700">{t('auth.development_otp')}</p><p className="mt-1 text-xl font-black tracking-[0.3em] text-amber-900">{devCode}</p></div>}<OTPInput value={otp} onChange={setOtp} onComplete={verify} disabled={loading} />{loading && <p className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" />{t('auth.verifying_account')}</p>}<p className="mt-6 text-xs text-gray-500">{t('auth.code_expires_return')}</p></div>}
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-gray-500">{t('auth.already_registered')} <Link href="/login" className="inline-flex min-h-11 items-center font-black text-[#B76E79]">{t('auth.login_link')}</Link></p>
      </div>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-sm font-bold text-gray-700">{label}</span>{children}</label> }
function Password({ value, onChange, visible, onToggle }: { value: string; onChange: (value: string) => void; visible: boolean; onToggle: () => void }) { const t = useT(); return <div className="relative"><Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input type={visible ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} placeholder={t('auth.password_hint')} className="input-field pl-10 pr-10" /><button type="button" onClick={onToggle} className="absolute right-0 top-1/2 grid h-11 w-11 -translate-y-1/2 touch-manipulation place-items-center rounded-full text-gray-500">{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div> }
