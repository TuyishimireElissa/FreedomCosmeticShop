'use client'

import { AlertCircle, Check, Edit2, Info, Lock, Smartphone } from 'lucide-react'
import MoMoWaiting from '@/components/checkout/MoMoWaiting'
import { BUSINESS } from '@/lib/business-config'
import { formatRwandaPhone, isAirtelNumber, isMTNNumber, normalizeRwandaPhone } from '@/lib/rwanda-locations'
import { useT } from '@/lib/i18n/LanguageContext'

interface MoMoPaymentProps {
  network: 'MTN' | 'AIRTEL'
  phone: string
  onPhoneChange: (phone: string) => void
  status?: 'idle' | 'initiating' | 'polling' | 'paid' | 'failed' | 'timeout'
  total: string
  remaining?: number
  onRetry?: () => void
  onCancel?: () => void
}

export default function MoMoPayment({ network, phone, onPhoneChange, status = 'idle', total, remaining = 300, onRetry, onCancel }: MoMoPaymentProps) {
  const t = useT()
  const mtn = network === 'MTN'
  const valid = mtn ? isMTNNumber(phone) : isAirtelNumber(phone)
  const busy = status === 'initiating' || status === 'polling'

  if (status !== 'idle') return <MoMoWaiting network={network} phone={phone} total={total} status={status} remaining={remaining} onRetry={onRetry} onCancel={onCancel} />

  return <div className={`mt-3 overflow-hidden rounded-2xl border-2 ${mtn ? 'border-[#FFD200] bg-[#fffbea]' : 'border-red-200 bg-red-50/50'}`}>
    <div className={`flex items-center gap-3 px-4 py-3 ${mtn ? 'bg-[#FFD200] text-[#1a1a1a]' : 'bg-red-600 text-white'}`}><span className={`grid h-11 w-11 place-items-center rounded-xl ${mtn ? 'bg-black text-[#FFD200]' : 'bg-white text-red-600'}`}><Smartphone className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="text-sm font-black">{mtn ? t('checkout.mtn_momo') : t('checkout.airtel_money')}</p><p className="text-xs font-medium opacity-80">{t('checkout.secure_amount', { amount: total })}</p></div>{mtn && <span className="rounded-full bg-black px-2.5 py-1 text-[10px] font-black uppercase text-[#FFD200]">{t('checkout.recommended')}</span>}</div>
    <div className="space-y-4 p-4">
      <label className="block text-sm font-bold text-gray-700">{t('checkout.network_phone', { network })}<div className="relative mt-1.5"><input type="tel" value={phone} onChange={(event) => onPhoneChange(formatRwandaPhone(event.target.value))} placeholder={mtn ? '+250 78X XXX XXX' : '+250 72X XXX XXX'} disabled={busy} inputMode="tel" autoComplete="tel" className={`min-h-12 w-full rounded-xl border-2 bg-white px-4 pr-12 text-base font-semibold focus:border-fcs-brand ${phone.trim().length > 5 ? valid ? 'border-emerald-400' : 'border-red-300' : 'border-gray-200'}`} />{phone.trim().length > 5 && <span className="absolute right-3 top-1/2 -translate-y-1/2">{valid ? <Check className="h-5 w-5 text-emerald-500" /> : <AlertCircle className="h-5 w-5 text-red-500" />}</span>}</div></label>
      <p className="text-xs text-gray-500">{mtn ? t('checkout.mtn_prefix_hint') : t('checkout.airtel_prefix_hint')}</p>
      {phone.trim().length > 5 && !valid && <p className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{t('checkout.invalid_network_phone', { network })}</p>}
      {valid && <div className="rounded-2xl border bg-white p-4"><div className="flex items-center justify-between gap-3"><span className="text-sm text-gray-500">{t('checkout.amount_to_approve')}</span><strong className="text-xl text-fcs-brand-text">{total}</strong></div><div className="mt-3 flex items-center justify-between gap-3"><span className="text-sm text-gray-500">{t('checkout.charging_phone')}</span><span className="flex items-center gap-2"><strong className="text-sm">{normalizeRwandaPhone(phone)}</strong><button type="button" onClick={() => onPhoneChange('+250 ')} aria-label={t('checkout.change_phone')} className="grid h-11 w-11 place-items-center rounded-full text-fcs-brand-text"><Edit2 className="h-4 w-4" /></button></span></div><div className="mt-2 flex justify-between gap-3 text-sm"><span className="text-gray-500">{t('checkout.merchant')}</span><strong>{BUSINESS.name}</strong></div></div>}
      {/* First-time buyers do not know a USSD prompt will take over their
          screen. Telling them beforehand is the difference between approving
          the payment and panicking out of it. */}
      <ol className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sky-900">
        <li className="mb-2 flex items-center gap-2 text-sm font-black"><Info className="h-4 w-4 shrink-0" aria-hidden="true" />{t('checkout.ussd_title')}</li>
        {[t('checkout.ussd_step1'), t('checkout.ussd_step2'), t('checkout.ussd_step3'), t('checkout.ussd_step4')].map((line, index) => (
          <li key={line} className="mt-1.5 flex gap-2.5 text-xs leading-5">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sky-600 text-[11px] font-black text-white" aria-hidden="true">{index + 1}</span>
            <span>{line}</span>
          </li>
        ))}
        <li className="mt-2.5 text-[11px] font-semibold text-sky-700">{t('checkout.ussd_wait')}</li>
      </ol>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3"><p className="flex items-center gap-2 text-sm font-black text-amber-900"><Lock className="h-4 w-4" />{t('checkout.pin_on_phone')}</p><p className="mt-1 text-xs leading-5 text-amber-800">{t('checkout.pin_warning')}</p></div>
    </div>
  </div>
}
