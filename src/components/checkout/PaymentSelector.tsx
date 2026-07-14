'use client'

import { Banknote, CreditCard, Smartphone } from 'lucide-react'
import MoMoPayment from '@/components/checkout/MoMoPayment'
import { useT } from '@/lib/i18n/LanguageContext'

export type CheckoutPaymentMethod = 'MTN_MOMO' | 'AIRTEL_MONEY' | 'CARD' | 'COD'

interface PaymentSelectorProps {
  method: CheckoutPaymentMethod
  onMethodChange: (method: CheckoutPaymentMethod) => void
  phone: string
  onPhoneChange: (phone: string) => void
  isKigali: boolean
  paymentStatus?: 'idle' | 'initiating' | 'polling' | 'paid' | 'failed' | 'timeout'
  paymentError?: string | null
  total: string
}

export default function PaymentSelector({ method, onMethodChange, phone, onPhoneChange, isKigali, paymentStatus, paymentError, total }: PaymentSelectorProps) {
  const t = useT()
  return (
    <div className="space-y-3">
      <PaymentCard selected={method === 'MTN_MOMO'} onClick={() => onMethodChange('MTN_MOMO')} icon={Smartphone} title={t('checkout.mtn_momo')} description={t('checkout.mtn_fastest_popular')} accent="mtn" badge={t('checkout.mtn_popular')} />
      {method === 'MTN_MOMO' && <MoMoPayment network="MTN" phone={phone} onPhoneChange={onPhoneChange} status={paymentStatus} error={paymentError} total={total} />}
      <PaymentCard selected={method === 'AIRTEL_MONEY'} onClick={() => onMethodChange('AIRTEL_MONEY')} icon={Smartphone} title={t('checkout.airtel_money')} description={t('checkout.airtel_pay_prefixes')} accent="airtel" />
      {method === 'AIRTEL_MONEY' && <MoMoPayment network="AIRTEL" phone={phone} onPhoneChange={onPhoneChange} status={paymentStatus} error={paymentError} total={total} />}
      <PaymentCard selected={method === 'CARD'} onClick={() => onMethodChange('CARD')} icon={CreditCard} title={t('checkout.card_payment')} description={t('checkout.flutterwave_secure')} accent="card" />
      {method === 'CARD' && <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-xs leading-5 text-blue-800">{t('checkout.card_redirect_notice')}</div>}
      <PaymentCard selected={method === 'COD'} onClick={() => isKigali && onMethodChange('COD')} icon={Banknote} title={t('checkout.cod')} description={isKigali ? t('checkout.pay_rider_arrival') : t('checkout.cod_districts_only')} accent="cod" disabled={!isKigali} />
    </div>
  )
}

function PaymentCard({ selected, onClick, icon: Icon, title, description, accent, badge, disabled = false }: { selected: boolean; onClick: () => void; icon: typeof Smartphone; title: string; description: string; accent: 'mtn' | 'airtel' | 'card' | 'cod'; badge?: string; disabled?: boolean }) {
  const colors = { mtn: 'bg-[#FFD200] text-[#1a1a1a]', airtel: 'bg-red-600 text-white', card: 'bg-blue-600 text-white', cod: 'bg-emerald-600 text-white' }
  return <button type="button" onClick={onClick} disabled={disabled} className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all ${selected ? 'border-[#B76E79] bg-rose-50/50 shadow-sm' : 'border-gray-100 bg-white hover:border-rose-100'} disabled:cursor-not-allowed disabled:opacity-45`}><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${colors[accent]}`}><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="text-sm font-black text-[#1a1a1a]">{title}</span>{badge && <span className="rounded-full bg-[#FFD200] px-2 py-0.5 text-[9px] font-black uppercase text-[#1a1a1a]">{badge}</span>}</span><span className="mt-0.5 block text-xs text-gray-500">{description}</span></span><span className={`grid h-5 w-5 place-items-center rounded-full border-2 ${selected ? 'border-[#B76E79]' : 'border-gray-300'}`}>{selected && <span className="h-2.5 w-2.5 rounded-full bg-[#B76E79]" />}</span></button>
}
