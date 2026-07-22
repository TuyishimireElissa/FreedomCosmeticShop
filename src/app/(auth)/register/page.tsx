'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { AlertCircle, ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, Lock, ShieldCheck, Sparkles } from 'lucide-react'
import { OTPInput } from '@/components/auth/OTPInput'
import { isValidRwandaPhone, normalizeRwandaPhone } from '@/lib/phone'
import { useStore } from '@/store/useStore'
import { useT } from '@/lib/i18n/LanguageContext'
import FormField from '@/components/a11y/FormField'

const skinTypes = ['OILY', 'DRY', 'COMBINATION', 'SENSITIVE', 'NORMAL', 'NOT_SURE'] as const
type RegistrationField = 'name' | 'phone' | 'email' | 'password' | 'confirm' | 'terms'

export default function RegisterPage() {
  const router = useRouter(); const t = useT(); const setUser = useStore((state) => state.setUser)
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', confirm: '', skinType: 'NOT_SURE', terms: false })
  const [showPassword, setShowPassword] = useState(false); const [otp, setOtp] = useState(''); const [devCode, setDevCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<RegistrationField, string>>>({})
  const update = (key: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }))
    if (key in fieldErrors) setFieldErrors((current) => ({ ...current, [key]: undefined }))
  }

  const validate = (): Partial<Record<RegistrationField, string>> => {
    const errors: Partial<Record<RegistrationField, string>> = {}
    if (form.name.trim().length < 2) errors.name = t('auth.enter_full_name')
    if (!isValidRwandaPhone(form.phone)) errors.phone = t('auth.rwanda_phone_format')
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = t('auth.valid_email_optional')
    if (form.password.length < 8) errors.password = t('auth.password_8_chars')
    if (form.password !== form.confirm) errors.confirm = t('auth.passwords_no_match')
    if (!form.terms) errors.terms = t('auth.accept_terms_privacy')
    return errors
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const validation = validate()
    setFieldErrors(validation)
    if (Object.keys(validation).length > 0) return
    setLoading(true); setError(null)
    try {
      const phone = normalizeRwandaPhone(form.phone)
      const response = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name.trim(), phone, email: form.email.trim() || undefined, password: form.password, skinType: form.skinType }) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error || t('auth.registration_failed'))
      if (data.verificationRequired === false && data.user) {
        localStorage.setItem('freedom-skin-type', form.skinType)
        setUser(data.user)
        router.push('/')
        router.refresh()
        return
      }
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
            {error && <div role="alert" aria-live="assertive" className="mb-5 flex items-center justify-center gap-2 rounded-xl bg-red-50 p-3 text-center text-sm font-semibold text-red-700"><AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />{error}</div>}
            {step === 'form' ? <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField id="register-name" label={t('auth.full_name')} required error={fieldErrors.name} value={form.name} onChange={(event) => update('name', event.target.value)} placeholder={t('auth.full_name_example')} autoComplete="name" />
                <FormField id="register-phone" label={t('auth.rwanda_phone_label')} required error={fieldErrors.phone} type="tel" inputMode="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder={t('auth.phone_placeholder')} autoComplete="tel" />
              </div>
              <FormField id="register-email" label={t('auth.email_optional')} error={fieldErrors.email} type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder={t('auth.email_placeholder')} autoComplete="email" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Password id="register-password" label={t('auth.password')} error={fieldErrors.password} value={form.password} onChange={(value) => update('password', value)} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />
                <Password id="register-confirm" label={t('auth.confirm_password')} error={fieldErrors.confirm} value={form.confirm} onChange={(value) => update('confirm', value)} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />
              </div>
              <fieldset><legend className="mb-1.5 text-sm font-semibold text-gray-900">{t('auth.skin_type')}</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{skinTypes.map((type) => <button key={type} type="button" aria-pressed={form.skinType === type} onClick={() => update('skinType', type)} className={`min-h-11 rounded-xl border px-3 py-2.5 text-xs font-bold ${form.skinType === type ? 'border-[#B76E79] bg-rose-50 text-[#B76E79]' : 'border-gray-200 text-gray-600 hover:border-rose-200'}`}>{type === 'NOT_SURE' ? t('auth.not_sure') : t(`skin_types.${type}`)}</button>)}</div></fieldset>
              <div><label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl bg-[#f8f9fa] p-3"><input required aria-required="true" aria-invalid={fieldErrors.terms ? true : undefined} aria-describedby={fieldErrors.terms ? 'register-terms-error' : undefined} type="checkbox" checked={form.terms} onChange={(event) => update('terms', event.target.checked)} className="mt-0.5 h-5 w-5 rounded border-gray-300 text-[#B76E79] focus:ring-[#B76E79]" /><span className="text-sm leading-6 text-gray-600">{t('auth.terms_agree')} <Link href="/terms" className="font-bold text-[#B76E79]">{t('auth.terms_link')}</Link> {t('common.and')} <Link href="/privacy" className="font-bold text-[#B76E79]">{t('auth.privacy_policy')}</Link>.</span></label>{fieldErrors.terms && <p id="register-terms-error" role="alert" className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-red-700"><AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{fieldErrors.terms}</p>}</div>
              <button type="submit" disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-[#B76E79] text-base font-black text-white shadow-lg shadow-rose-100 disabled:opacity-50">{loading ? <><Loader2 className="h-4 w-4 animate-spin" />{t('auth.sending_otp')}</> : <>{t('auth.register_button')} <ArrowRight className="h-4 w-4" /></>}</button>
              <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />{t('auth.password_hashed')}</p>
            </form> : <div className="py-4 text-center"><button type="button" onClick={() => { setStep('form'); setOtp(''); setError(null) }} className="mb-6 inline-flex items-center gap-1 min-h-11 text-sm font-bold text-gray-600"><ArrowLeft className="h-3.5 w-3.5" />{t('auth.edit_details')}</button>{devCode && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3"><p className="text-xs font-bold uppercase tracking-wider text-amber-700">{t('auth.development_otp')}</p><p className="mt-1 text-xl font-black tracking-[0.3em] text-amber-900">{devCode}</p></div>}<OTPInput value={otp} onChange={setOtp} onComplete={verify} disabled={loading} />{loading && <p className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" />{t('auth.verifying_account')}</p>}<p className="mt-6 text-xs text-gray-500">{t('auth.code_expires_return')}</p></div>}
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-gray-500">{t('auth.already_registered')} <Link href="/login" className="inline-flex min-h-11 items-center font-black text-[#B76E79]">{t('auth.login_link')}</Link></p>
      </div>
    </main>
  )
}

function Password({ id, label, error, value, onChange, visible, onToggle }: { id: string; label: string; error?: string; value: string; onChange: (value: string) => void; visible: boolean; onToggle: () => void }) { const t = useT(); return <FormField id={id} label={label} error={error} required type={visible ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} placeholder={t('auth.password_hint')} autoComplete="new-password" startAdornment={<Lock className="h-4 w-4 text-gray-500" />} endAdornment={<button type="button" onClick={onToggle} className="grid h-11 w-11 place-items-center rounded-full text-gray-600" aria-label={visible ? t('auth.hide_password') : t('auth.show_password')}>{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>} /> }
