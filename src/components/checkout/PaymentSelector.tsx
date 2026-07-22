'use client'

import { AlertCircle, Banknote, CreditCard, Smartphone } from 'lucide-react'
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
  total: string
  remaining?: number
  onRetry?: () => void
  onCancel?: () => void
}

export default function PaymentSelector({ method, onMethodChange, phone, onPhoneChange, isKigali, paymentStatus, total, remaining, onRetry, onCancel }: PaymentSelectorProps) {
  const t = useT()
  return <div className="space-y-3">
    {!isKigali && <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span><strong className="block">{t('checkout.cod_kigali_warning')}</strong>{t('checkout.cod_kigali_warning_detail')}</span></div>}
    <PaymentCard selected={method === 'MTN_MOMO'} onClick={() => onMethodChange('MTN_MOMO')} icon={Smartphone} title={t('checkout.mtn_momo')} description={t('checkout.mtn_fastest_popular')} accent="mtn" badge={t('checkout.mtn_popular')} />
    {method === 'MTN_MOMO' && <MoMoPayment network="MTN" phone={phone} onPhoneChange={onPhoneChange} status={paymentStatus} total={total} remaining={remaining} onRetry={onRetry} onCancel={onCancel} />}
    <PaymentCard selected={method === 'AIRTEL_MONEY'} onClick={() => onMethodChange('AIRTEL_MONEY')} icon={Smartphone} title={t('checkout.airtel_money')} description={t('checkout.airtel_pay_prefixes')} accent="airtel" />
    {method === 'AIRTEL_MONEY' && <MoMoPayment network="AIRTEL" phone={phone} onPhoneChange={onPhoneChange} status={paymentStatus} total={total} remaining={remaining} onRetry={onRetry} onCancel={onCancel} />}
    <PaymentCard selected={method === 'CARD'} onClick={() => onMethodChange('CARD')} icon={CreditCard} title={t('checkout.card_payment')} description={t('checkout.flutterwave_secure')} accent="card" />
    {method === 'CARD' && <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm leading-6 text-blue-800">{t('checkout.card_redirect_notice')}</div>}
    <PaymentCard selected={method === 'COD'} onClick={() => isKigali && onMethodChange('COD')} icon={Banknote} title={t('checkout.cod')} description={isKigali ? t('checkout.pay_rider_arrival') : t('checkout.cod_districts_only')} accent="cod" disabled={!isKigali} badge={isKigali ? t('checkout.kigali_only') : undefined} />
    {method === 'COD' && isKigali && <div className="rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-700">{t('checkout.cod_exact_amount', { amount: total })}</div>}
  </div>
}

function PaymentCard({ selected, onClick, icon: Icon, title, description, accent, badge, disabled = false }: { selected: boolean; onClick: () => void; icon: typeof Smartphone; title: string; description: string; accent: 'mtn' | 'airtel' | 'card' | 'cod'; badge?: string; disabled?: boolean }) {
  const colors = { mtn: 'bg-amber-50 text-amber-700', airtel: 'bg-red-50 text-red-700', card: 'bg-slate-100 text-slate-700', cod: 'bg-emerald-50 text-emerald-700' }
  return <button type="button" onClick={onClick} disabled={disabled} className={`flex min-h-[72px] w-full touch-manipulation items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${selected ? 'border-[#B76E79] bg-[#B76E79]/5' : 'border-[#EEEEEE] bg-white hover:border-[#D9C0C4]'} disabled:cursor-not-allowed disabled:opacity-45`}><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${colors[accent]}`}><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="text-base font-semibold text-[#1a1a1a]">{title}</span>{badge && <span className="rounded-full bg-[#FFD200] px-2 py-0.5 text-[10px] font-medium uppercase text-[#1a1a1a]">{badge}</span>}</span><span className="mt-0.5 block text-sm text-gray-500">{description}</span></span><span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${selected ? 'border-[#B76E79]' : 'border-gray-300'}`}>{selected && <span className="h-2.5 w-2.5 rounded-full bg-[#B76E79]" />}</span></button>
}
