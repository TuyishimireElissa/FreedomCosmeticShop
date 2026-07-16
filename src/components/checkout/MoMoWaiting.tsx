'use client'

import { AlertCircle, Check, Loader2, Phone, RefreshCw, X } from 'lucide-react'
import { normalizeRwandaPhone } from '@/lib/rwanda-locations'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { buildWhatsAppUrl, trackWhatsAppClick } from '@/lib/whatsapp-service'

interface MoMoWaitingProps {
  network: 'MTN' | 'AIRTEL'
  phone: string
  total: string
  status: 'initiating' | 'polling' | 'paid' | 'failed' | 'timeout'
  remaining: number
  onRetry?: () => void
  onCancel?: () => void
}

function clock(seconds: number) {
  const safe = Math.max(0, seconds)
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}

export default function MoMoWaiting({ network, phone, total, status, remaining, onRetry, onCancel }: MoMoWaitingProps) {
  const { t, language } = useLanguage()
  const displayPhone = normalizeRwandaPhone(phone)
  const waiting = status === 'initiating' || status === 'polling'

  if (status === 'paid') return <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-white"><Check className="h-8 w-8" /></span><h3 className="mt-4 text-lg font-black text-emerald-800">{t('checkout.payment_confirmed_title')}</h3></div>

  if (!waiting) return <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white text-red-500"><AlertCircle className="h-7 w-7" /></span><h3 className="mt-3 font-black text-gray-900">{status === 'timeout' ? t('checkout.payment_timeout_title') : t('checkout.payment_failed_title')}</h3><p className="mt-2 text-sm leading-6 text-gray-600">{status === 'timeout' ? t('checkout.payment_timeout_safe_help') : t('checkout.payment_failed_recovery')}</p><div className="mt-4 grid gap-2 sm:grid-cols-2"><button type="button" onClick={onRetry} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#B76E79] font-black text-white"><RefreshCw className="h-4 w-4" />{t('checkout.retry_payment')}</button><a href={buildWhatsAppUrl(t('checkout.payment_help_message'))} onClick={() => trackWhatsAppClick('payment_help', { language: language === 'en' ? 'en' : 'rw', pagePath: '/checkout' })} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center rounded-xl border border-green-200 bg-white font-bold text-green-700">{t('checkout.get_whatsapp_help')}</a></div></div>

  return <div className="mt-4 rounded-2xl border-2 border-[#B76E79]/20 bg-white p-5 text-center shadow-sm">
    <div className="relative mx-auto h-24 w-24"><span className="absolute inset-0 animate-ping rounded-full bg-[#B76E79]/10" /><span className="relative mx-auto grid h-24 w-24 place-items-center rounded-full bg-[#B76E79] text-white shadow-lg shadow-rose-200"><Phone className="h-10 w-10" /></span></div>
    <h3 className="mt-5 text-xl font-black text-gray-900">{t('checkout.check_phone_title')}</h3>
    <p className="mt-2 text-sm text-gray-600">{t('checkout.prompt_sent_to', { network, phone: displayPhone })}</p>
    <div className="mt-4 rounded-2xl bg-gray-50 p-4"><div className="flex justify-between gap-3 text-sm"><span className="text-gray-500">{t('checkout.amount_to_approve')}</span><strong className="text-lg text-[#B76E79]">{total}</strong></div><div className="mt-2 flex justify-between gap-3 text-sm"><span className="text-gray-500">{t('checkout.charging_phone')}</span><strong>{displayPhone}</strong></div></div>
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left"><strong className="text-sm text-amber-900">{t('checkout.pin_on_phone')}</strong><p className="mt-1 text-xs leading-5 text-amber-800">{t('checkout.pin_warning')}</p></div>
    <p className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin text-[#B76E79]" />{t('checkout.waiting_with_time', { time: clock(remaining) })}</p>
    <button type="button" onClick={onCancel} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 text-sm font-bold text-gray-500"><X className="h-4 w-4" />{t('checkout.cancel_waiting')}</button>
  </div>
}
