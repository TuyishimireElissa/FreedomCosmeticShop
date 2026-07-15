'use client'

import { CheckCircle2, Loader2, Lock, Smartphone } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface MoMoPaymentProps {
  network: 'MTN' | 'AIRTEL'
  phone: string
  onPhoneChange: (phone: string) => void
  status?: 'idle' | 'initiating' | 'polling' | 'paid' | 'failed' | 'timeout'
  error?: string | null
  total: string
}

export default function MoMoPayment({ network, phone, onPhoneChange, status = 'idle', error, total }: MoMoPaymentProps) {
  const { t, tArray } = useLanguage()
  const mtn = network === 'MTN'
  const busy = status === 'initiating' || status === 'polling'

  return (
    <div className={`mt-4 overflow-hidden rounded-2xl border-2 ${mtn ? 'border-[#FFD200] bg-[#fffbea]' : 'border-red-200 bg-red-50/50'}`}>
      <div className={`flex items-center gap-3 px-4 py-3 ${mtn ? 'bg-[#FFD200] text-[#1a1a1a]' : 'bg-red-600 text-white'}`}><span className={`grid h-10 w-10 place-items-center rounded-xl ${mtn ? 'bg-black text-[#FFD200]' : 'bg-white text-red-600'}`}><Smartphone className="h-5 w-5" /></span><div><p className="text-sm font-black">{mtn ? t('checkout.mtn_momo') : t('checkout.airtel_money')}</p><p className="text-xs font-medium opacity-80">Secure mobile payment · {total}</p></div>{mtn && <span className="ml-auto rounded-full bg-black px-2.5 py-1 text-xs font-black uppercase tracking-wider text-[#FFD200]">Recommended</span>}</div>
      <div className="p-4">
        <label className="text-sm font-bold text-gray-700">{network} phone number<input type="tel" value={phone} onChange={(event) => onPhoneChange(event.target.value)} placeholder={mtn ? '078X XXX XXX or 079X XXX XXX' : '072X XXX XXX or 073X XXX XXX'} disabled={busy} className="mt-1.5 min-h-12 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-base font-semibold focus:border-[#B76E79]" /></label>
        {busy ? <div className="mt-4 flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm"><Loader2 className={`h-5 w-5 animate-spin ${mtn ? 'text-[#c8a800]' : 'text-red-600'}`} /><div><p className="text-sm font-bold text-gray-800">{t('checkout.momo_waiting_title')}</p><p className="text-sm text-gray-600">{t('checkout.momo_waiting_hint')}</p></div></div> : status === 'paid' ? <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700"><CheckCircle2 className="h-5 w-5" />{t('checkout.payment_confirmed_title')}</div> : error ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : <ol className="mt-4 grid gap-2 text-sm text-gray-600 sm:grid-cols-3">{tArray('checkout.momo_steps').slice(0, 3).map((step, index) => <li key={step} className="rounded-xl bg-white p-3"><strong className="mb-1 block text-gray-800">{index + 1}</strong>{step}</li>)}</ol>}
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500"><Lock className="h-3 w-3" />{t('checkout.pin_private')}</p>
      </div>
    </div>
  )
}
