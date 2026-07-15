'use client'

import { useState, type FormEvent } from 'react'
import { ArrowLeft, KeyRound, Loader2, ShieldCheck } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageContext'

export default function MFALoginChallenge({
  challengeToken,
  onSuccess,
  onCancel,
}: {
  challengeToken: string
  onSuccess: (user: unknown) => void | Promise<void>
  onCancel: () => void
}) {
  const t = useT()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (code.replace(/\s/g, '').length < 6) {
      setError(t('auth.mfa_code_required'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeToken, code: code.trim() }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || t('auth.verification_failed'))
      await onSuccess(data.user)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('auth.verification_failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><ShieldCheck className="h-7 w-7" /></span>
        <h2 className="mt-4 text-2xl font-black text-[#1a1a1a]">{t('auth.mfa_title')}</h2>
        <p className="mt-2 text-sm leading-6 text-gray-500">{t('auth.mfa_hint')}</p>
      </div>
      {error && <p className="rounded-xl bg-red-50 p-3 text-center text-sm font-semibold text-red-700" role="alert">{error}</p>}
      <label className="block"><span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-gray-500">{t('auth.authenticator_backup_code')}</span><div className="relative"><KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))} inputMode="numeric" autoComplete="one-time-code" maxLength={32} autoFocus className="input-field pl-10 text-center font-mono text-xl tracking-[0.2em]" placeholder="000000" /></div></label>
      <button type="submit" disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#B76E79] text-base font-black text-white disabled:opacity-50">{loading ? <><Loader2 className="h-4 w-4 animate-spin" />{t('auth.otp_verifying')}</> : t('auth.verify_continue')}</button>
      <button type="button" onClick={onCancel} disabled={loading} className="flex min-h-11 w-full items-center justify-center gap-1 text-sm font-bold text-gray-600"><ArrowLeft className="h-3.5 w-3.5" />{t('auth.back_password_login')}</button>
    </form>
  )
}
