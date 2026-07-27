'use client'

import { useEffect, useId, useState } from 'react'
import { BellRing, Languages, Mail, MessageCircle, Smartphone } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type BooleanPreference =
  | 'smsEnabled'
  | 'whatsappEnabled'
  | 'emailEnabled'
  | 'reorderReminders'
  | 'priceDropAlerts'
  | 'backInStockAlerts'
  | 'birthdayRewards'
  | 'postDeliveryTips'
  | 'abandonedCartReminders'
  | 'wishlistReminders'

type Preferences = Record<BooleanPreference, boolean> & {
  language: 'rw' | 'en'
  availability: { sms: boolean; whatsapp: boolean; email: boolean }
}

const defaults: Preferences = {
  language: 'rw',
  smsEnabled: false,
  whatsappEnabled: false,
  emailEnabled: false,
  reorderReminders: false,
  priceDropAlerts: false,
  backInStockAlerts: false,
  birthdayRewards: false,
  postDeliveryTips: false,
  abandonedCartReminders: false,
  wishlistReminders: false,
  availability: { sms: false, whatsapp: false, email: false },
}

const channels: Array<{ field: BooleanPreference; icon: typeof Smartphone; label: string; description: string; availability: keyof Preferences['availability'] }> = [
  { field: 'smsEnabled', icon: Smartphone, label: 'communication_preferences.sms', description: 'communication_preferences.sms_description', availability: 'sms' },
  { field: 'whatsappEnabled', icon: MessageCircle, label: 'communication_preferences.whatsapp', description: 'communication_preferences.whatsapp_description', availability: 'whatsapp' },
  { field: 'emailEnabled', icon: Mail, label: 'communication_preferences.email', description: 'communication_preferences.email_description', availability: 'email' },
]

const purposes: Array<{ field: BooleanPreference; label: string; description: string }> = [
  { field: 'reorderReminders', label: 'communication_preferences.reorder', description: 'communication_preferences.reorder_description' },
  { field: 'priceDropAlerts', label: 'communication_preferences.price_drop', description: 'communication_preferences.price_drop_description' },
  { field: 'backInStockAlerts', label: 'communication_preferences.back_in_stock', description: 'communication_preferences.back_in_stock_description' },
  { field: 'birthdayRewards', label: 'communication_preferences.birthday', description: 'communication_preferences.birthday_description' },
  { field: 'postDeliveryTips', label: 'communication_preferences.post_delivery', description: 'communication_preferences.post_delivery_description' },
  { field: 'abandonedCartReminders', label: 'communication_preferences.abandoned_cart', description: 'communication_preferences.abandoned_cart_description' },
  { field: 'wishlistReminders', label: 'communication_preferences.wishlist', description: 'communication_preferences.wishlist_description' },
]

export default function CommunicationPreferences() {
  const { t, language, setLanguage } = useLanguage()
  const headingId = useId()
  const statusId = useId()
  const [preferences, setPreferences] = useState<Preferences>(defaults)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  useEffect(() => {
    let active = true
    fetch('/api/user/communication-preferences', { credentials: 'same-origin', cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('PREFERENCES_UNAVAILABLE')
        return response.json() as Promise<{ preferences: Preferences }>
      })
      .then((data) => { if (active) setPreferences(data.preferences) })
      .catch(() => { if (active) setStatus('error') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  async function save(update: Partial<Record<BooleanPreference, boolean>> | { language: 'rw' | 'en' }, key: string) {
    if (pending) return
    const previous = preferences
    const optimistic = { ...preferences, ...update }
    setPreferences(optimistic)
    setPending(key)
    setStatus('idle')
    try {
      const response = await fetch('/api/user/communication-preferences', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      })
      if (!response.ok) throw new Error('PREFERENCES_UNAVAILABLE')
      const data = await response.json() as { preferences: Preferences }
      setPreferences(data.preferences)
      if ('language' in update) setLanguage(update.language)
      setStatus('saved')
    } catch {
      setPreferences(previous)
      setStatus('error')
    } finally {
      setPending(null)
    }
  }

  if (loading) {
    return <section className="rounded-2xl border border-gray-200 bg-white p-5" aria-busy="true"><p className="text-sm text-gray-600">{t('communication_preferences.loading')}</p></section>
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6" aria-labelledby={headingId}>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rose-50 text-[#8a4b55]"><BellRing className="h-5 w-5" aria-hidden="true" /></span>
        <div>
          <h2 id={headingId} className="text-xl font-black text-gray-950">{t('communication_preferences.title')}</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">{t('communication_preferences.description')}</p>
        </div>
      </div>

      <fieldset className="mt-6">
        <legend className="text-sm font-black text-gray-950">{t('communication_preferences.channels')}</legend>
        <p className="mt-1 text-xs leading-5 text-gray-500">{t('communication_preferences.channels_help')}</p>
        <div className="mt-3 space-y-3">
          {channels.map((item) => {
            const available = preferences.availability[item.availability]
            const Icon = item.icon
            return (
              <label key={item.field} className={`flex min-h-16 items-center gap-3 rounded-xl border p-3 ${available ? 'cursor-pointer border-gray-200' : 'cursor-not-allowed border-gray-100 bg-gray-50'}`}>
                <Icon className="h-5 w-5 shrink-0 text-gray-500" aria-hidden="true" />
                <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-gray-900">{t(item.label)}</span><span className="block text-xs leading-5 text-gray-500">{t(item.description)}</span>{!available && <span className="mt-1 block text-xs font-bold text-amber-800">{t('communication_preferences.unavailable')}</span>}</span>
                <input type="checkbox" role="switch" checked={preferences[item.field]} disabled={!available || Boolean(pending)} onChange={(event) => void save({ [item.field]: event.target.checked }, item.field)} aria-describedby={statusId} className="h-6 w-6 shrink-0 rounded border-gray-300 text-[#B76E79] focus:ring-2 focus:ring-[#B76E79] focus:ring-offset-2 disabled:opacity-50" />
              </label>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="mt-7">
        <legend className="text-sm font-black text-gray-950">{t('communication_preferences.purposes')}</legend>
        <p className="mt-1 text-xs leading-5 text-gray-500">{t('communication_preferences.purposes_help')}</p>
        <div className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-200">
          {purposes.map((item) => (
            <label key={item.field} className="flex min-h-[68px] cursor-pointer items-center gap-3 p-3">
              <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-gray-900">{t(item.label)}</span><span className="block text-xs leading-5 text-gray-500">{t(item.description)}</span></span>
              <input type="checkbox" role="switch" checked={preferences[item.field]} disabled={Boolean(pending)} onChange={(event) => void save({ [item.field]: event.target.checked }, item.field)} aria-describedby={statusId} className="h-6 w-6 shrink-0 rounded border-gray-300 text-[#B76E79] focus:ring-2 focus:ring-[#B76E79] focus:ring-offset-2 disabled:opacity-50" />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-7">
        <legend className="flex items-center gap-2 text-sm font-black text-gray-950"><Languages className="h-4 w-4" aria-hidden="true" />{t('communication_preferences.language')}</legend>
        <p className="mt-1 text-xs leading-5 text-gray-500">{t('communication_preferences.language_help')}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(['rw', 'en'] as const).map((option) => (
            <label key={option} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-900">
              <input type="radio" name="retention-language" value={option} checked={preferences.language === option} disabled={Boolean(pending)} onChange={() => void save({ language: option }, `language-${option}`)} className="h-5 w-5 border-gray-300 text-[#B76E79] focus:ring-[#B76E79]" />
              {t(option === 'rw' ? 'communication_preferences.kinyarwanda' : 'communication_preferences.english')}
            </label>
          ))}
        </div>
        {preferences.language !== language && <p className="mt-2 text-xs text-gray-500">{t('communication_preferences.site_language_note')}</p>}
      </fieldset>

      <p id={statusId} className={`mt-5 min-h-6 text-sm font-semibold ${status === 'error' ? 'text-red-700' : 'text-green-700'}`} role="status" aria-live="polite">
        {pending ? t('communication_preferences.saving') : status === 'saved' ? t('communication_preferences.saved') : status === 'error' ? t('communication_preferences.save_error') : ''}
      </p>
      <p className="mt-1 text-xs leading-5 text-gray-500">{t('communication_preferences.opt_out_note')}</p>
    </section>
  )
}
