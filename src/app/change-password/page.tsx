'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, Lock, ShieldCheck } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useT } from '@/lib/i18n/LanguageContext'

export default function ChangePasswordPage() {
  const t = useT()
  const router = useRouter()
  const user = useStore((state) => state.user)
  const fetchUser = useStore((state) => state.fetchUser)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (newPassword !== confirm) {
      setError(t('auth.passwords_no_match'))
      return
    }
    setLoading(true)
    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error()
      await fetchUser()
      const role = useStore.getState().user?.role
      router.replace(['ADMIN', 'SUPER_ADMIN', 'STAFF', 'MANAGER'].includes(role || '') ? '/admin' : '/account')
      router.refresh()
    } catch {
      setError(t('auth.password_change_failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-gradient-to-br from-[#1a1a1a] via-[#2d2426] to-[#6f4249] px-4 py-10">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-[#B76E79]"><ShieldCheck className="h-7 w-7" aria-hidden="true" /></span>
        <h1 className="mt-5 text-center text-2xl font-black">{t('auth.change_password_title')}</h1>
        <p className="mt-2 text-center text-sm leading-6 text-gray-500">{t(user?.mustChangePassword ? 'auth.temporary_password_replace' : 'auth.unique_password_advice')}</p>
        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-center text-sm font-semibold text-red-700" role="alert" aria-live="assertive">{error}</p>}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Password label={t('auth.current_password')} value={currentPassword} setValue={setCurrentPassword} visible={visible} autoComplete="current-password" />
          <Password label={t('auth.new_password')} value={newPassword} setValue={setNewPassword} visible={visible} autoComplete="new-password" />
          <Password label={t('auth.confirm_new_password')} value={confirm} setValue={setConfirm} visible={visible} autoComplete="new-password" />
          <button type="button" onClick={() => setVisible((value) => !value)} className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-bold text-gray-600">
            {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            {t(visible ? 'auth.hide_passwords' : 'auth.show_passwords')}
          </button>
          <div className="rounded-xl bg-gray-50 p-3 text-xs leading-5 text-gray-600">{t('auth.strong_password_requirement')}</div>
          <button type="submit" disabled={loading || !currentPassword || !newPassword || !confirm} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#B76E79] text-sm font-black text-white disabled:opacity-50">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />{t('auth.updating_password')}</> : t('auth.change_password_button')}
          </button>
        </form>
      </div>
    </main>
  )
}

function Password({ label, value, setValue, visible, autoComplete }: { label: string; value: string; setValue: (value: string) => void; visible: boolean; autoComplete: 'current-password' | 'new-password' }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-gray-500">{label}</span><div className="relative"><Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" /><input type={visible ? 'text' : 'password'} value={value} onChange={(event) => setValue(event.target.value)} autoComplete={autoComplete} className="input-field pl-10" required /></div></label>
}
