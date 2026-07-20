'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, Check, ChevronRight, Loader2, ShieldCheck, ShoppingBag, Truck } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { formatRWF } from '@/lib/format'
import { normalizeRwandaPhone } from '@/lib/rwanda-locations'
import { usePaymentPolling } from '@/hooks/usePaymentPolling'
import AddressForm, { type CheckoutAddress } from '@/components/checkout/AddressForm'
import PaymentSelector, { type CheckoutPaymentMethod } from '@/components/checkout/PaymentSelector'
import OrderSummary from '@/components/checkout/OrderSummary'
import ConfirmationView, { type ConfirmedCheckoutOrder } from '@/components/checkout/ConfirmationView'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useAnalytics } from '@/hooks/useAnalytics'

const initialAddress: CheckoutAddress = { fullName: '', phone: '+250 ', email: '', province: '', district: '', sector: '', cell: '', village: '', landmark: '', address: '' }
type Step = 1 | 2 | 3

type CompletedOrder = ConfirmedCheckoutOrder

export default function CheckoutPage() {
  const { t, language } = useLanguage()
  const { items, cartSubtotal, appliedCoupon, clearCart, user } = useStore()
  const polling = usePaymentPolling()
  const {
    trackBeginCheckout,
    trackAddressCompleted,
    trackPaymentSelected,
    trackPaymentStarted,
    trackPaymentFailed,
    trackPurchaseCompleted,
  } = useAnalytics()
  const checkoutStarted = useRef(false)
  const completedAnalyticsOrders = useRef(new Set<string>())
  const [step, setStep] = useState<Step>(1)
  const [address, setAddress] = useState<CheckoutAddress>(() => ({ ...initialAddress, fullName: user?.name || '', phone: user?.phone || '+250 ' }))
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>('MTN_MOMO')
  const [paymentPhone, setPaymentPhone] = useState(address.phone)
  const [deliveryFee, setDeliveryFee] = useState(1000)
  const [deliveryLoading, setDeliveryLoading] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [pendingOrder, setPendingOrder] = useState<{ id: string; orderNumber: string; total: number } | null>(null)
  const [completedOrder, setCompletedOrder] = useState<CompletedOrder | null>(null)

  useEffect(() => {
    if (user) setAddress((value) => ({ ...value, fullName: value.fullName || user.name, phone: value.phone === '+250 ' ? user.phone : value.phone, email: value.email || user.email || '' }))
  }, [user])
  useEffect(() => setPaymentPhone(address.phone), [address.phone])
  useEffect(() => { if (paymentMethod === 'COD' && address.province !== 'Kigali City') setPaymentMethod('MTN_MOMO') }, [address.province, paymentMethod])
  useEffect(() => {
    if (items.length === 0 || checkoutStarted.current) return
    checkoutStarted.current = true
    trackBeginCheckout()
  }, [items.length, trackBeginCheckout])

  useEffect(() => {
    if (!address.district) { setDeliveryFee(0); setDeliveryLoading(false); return }
    const controller = new AbortController(); setDeliveryLoading(true)
    fetch(`/api/delivery/fee?district=${encodeURIComponent(address.district)}`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error(); return response.json() })
      .then((data) => setDeliveryFee(data.fee ?? 3000))
      .catch(() => setDeliveryFee(3000))
      .finally(() => { if (!controller.signal.aborted) setDeliveryLoading(false) })
    return () => controller.abort()
  }, [address.district])

  const subtotal = cartSubtotal()
  const discount = appliedCoupon?.discountAmount || 0
  const finalDelivery = appliedCoupon?.freeShipping ? 0 : deliveryFee
  const total = Math.max(0, subtotal - discount + finalDelivery)
  const phoneValid = /^(?:250|0)?7[2389]\d{7}$/.test(address.phone.replace(/\D/g, ''))
  const addressErrors = useMemo(() => ({
    fullName: address.fullName.trim().length < 2 ? t('checkout.error_full_name') : undefined,
    phone: !phoneValid ? t('checkout.error_rwanda_phone') : undefined,
    email: address.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.email) ? t('checkout.invalid_email') : undefined,
    province: !address.province ? t('checkout.error_select_province') : undefined,
    district: !address.district ? t('checkout.error_select_district') : undefined,
    sector: !address.sector ? t('checkout.error_select_sector') : undefined,
    cell: !address.cell ? t('checkout.error_select_cell') : undefined,
    village: !address.village ? t('checkout.error_select_village') : undefined,
    address: address.address.trim().length < 5 ? t('checkout.error_delivery_details') : undefined,
  }), [address, phoneValid, t])
  const addressValid = !Object.values(addressErrors).some(Boolean)
  const momoValid = paymentMethod === 'MTN_MOMO' ? /^(?:250|0)?7[89]\d{7}$/.test(paymentPhone.replace(/\D/g, '')) : paymentMethod === 'AIRTEL_MONEY' ? /^(?:250|0)?7[23]\d{7}$/.test(paymentPhone.replace(/\D/g, '')) : true

  const finishOrder = (order: { id: string; orderNumber: string; total: number }) => {
    if (!completedAnalyticsOrders.current.has(order.id)) {
      completedAnalyticsOrders.current.add(order.id)
      trackPurchaseCompleted(order.total, paymentMethod, address.district)
    }
    setCompletedOrder({ ...order, items: [...items] }); clearCart(); setStep(3); window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    if (polling.status === 'paid' && pendingOrder) finishOrder(pendingOrder)
  }, [polling.status, pendingOrder]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (polling.status === 'failed') trackPaymentFailed(paymentMethod, 'PROVIDER_FAILED')
    if (polling.status === 'timeout') trackPaymentFailed(paymentMethod, 'PROVIDER_TIMEOUT')
  }, [paymentMethod, polling.status, trackPaymentFailed])

  const initiatePayment = async (order: { id: string; orderNumber: string; total: number }) => {
    trackPaymentStarted(paymentMethod, order.total)
    try {
      if (paymentMethod === 'COD') { finishOrder(order); return }
    if (paymentMethod === 'CARD') {
      const response = await fetch('/api/payments/card', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: order.id, language }) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error === 'ORDER_STOCK_CHANGED' ? t('checkout.stock_changed_before_payment') : t('checkout.card_start_failed'))
      if (data.paymentLink) { window.location.assign(data.paymentLink); return }
      polling.start(data.transactionId); return
    }
    const network = paymentMethod === 'MTN_MOMO' ? 'MTN' : 'AIRTEL'
    const response = await fetch('/api/payments/momo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: order.id, phone: paymentPhone, network, language }) })
    const data = await response.json(); if (!response.ok) throw new Error(data.error === 'ORDER_STOCK_CHANGED' ? t('checkout.stock_changed_before_payment') : data.error === 'INVALID_NETWORK_PHONE' ? t('checkout.invalid_network_phone', { network }) : t('checkout.mobile_money_start_failed'))
      polling.start(data.transactionId)
    } catch (error) {
      trackPaymentFailed(paymentMethod, 'PAYMENT_START_FAILED')
      throw error
    }
  }

  const placeOrder = async () => {
    if (!addressValid || !momoValid || items.length === 0) return
    setPlacing(true); setCheckoutError(null)
    try {
      if (pendingOrder) { await initiatePayment(pendingOrder); return }
      const orderResponse = await fetch('/api/orders/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerName: address.fullName.trim(), customerPhone: normalizeRwandaPhone(address.phone), customerEmail: address.email.trim() || undefined, language, address: `${address.village}, ${address.cell}, ${address.sector}. ${address.address.trim()}${address.landmark ? ` (Landmark: ${address.landmark})` : ''}`, city: address.sector, province: address.province, district: address.district, sector: address.sector, landmark: address.landmark || undefined, paymentMethod, couponCode: appliedCoupon?.code, items: items.map((item) => item.isBundle && item.bundleId ? { bundleId: item.bundleId, quantity: item.quantity } : { productId: item.productId, quantity: item.quantity }) }) })
      const orderData = await orderResponse.json()
      if (!orderResponse.ok) throw new Error(orderData.error || t('checkout.order_create_failed'))
      const order = { id: orderData.order.id, orderNumber: orderData.order.orderNumber, total: orderData.order.total, confirmationDelivery: orderData.confirmationDelivery }
      setPendingOrder(order)
      await initiatePayment(order)
    } catch (reason) { setCheckoutError(reason instanceof Error ? reason.message : t('checkout.checkout_failed')) }
    finally { setPlacing(false) }
  }

  if (items.length === 0 && !completedOrder) return <div className="mx-auto grid min-h-[65vh] max-w-2xl place-items-center px-4 text-center"><div><ShoppingBag className="mx-auto h-14 w-14 text-[#B76E79]" /><h1 className="mt-5 text-2xl font-black">{t('cart.empty')}</h1><p className="mt-2 text-sm text-gray-500">{t('empty.cart_hint')}</p><Link href="/products" className="mt-5 inline-flex min-h-12 items-center rounded-full bg-[#B76E79] px-6 py-3 text-base font-bold text-white">{t('nav.products')}</Link></div></div>

  return (
    <div className="safe-bottom min-h-screen bg-[#f8f9fa]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-7 text-center"><span className="text-xs font-black uppercase tracking-[0.2em] text-[#B76E79]">{t('checkout.secure_rwanda_checkout')}</span><h1 className="mt-2 text-3xl font-black text-[#1a1a1a]">{t('checkout.title')}</h1></div>
        <div className="mb-6 flex items-center gap-1 lg:hidden" aria-label={t('checkout.title')}>
          {[1, 2, 3].map((number) => <span key={number} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${number <= step ? 'bg-[#B76E79]' : 'bg-gray-200'}`} />)}
        </div>
        <div className="mx-auto mb-8 hidden max-w-xl items-center lg:flex">{([{ label: t('checkout.step_address'), number: 1 }, { label: t('checkout.step_payment'), number: 2 }, { label: t('checkout.step_confirm'), number: 3 }] as const).map(({ label, number }, index) => <div key={label} className="contents"><div className="flex flex-col items-center gap-1"><span className={`grid h-9 w-9 place-items-center rounded-full text-xs font-black ${step >= number ? 'bg-[#B76E79] text-white' : 'bg-gray-200 text-gray-500'}`}>{step > number ? <Check className="h-4 w-4" /> : number}</span><span className="text-sm font-bold text-gray-500">{label}</span></div>{index < 2 && <div className={`mb-5 h-0.5 flex-1 ${step > number ? 'bg-[#B76E79]' : 'bg-gray-200'}`} />}</div>)}</div>

        {step === 3 && completedOrder ? <ConfirmationView order={completedOrder} address={address} paymentMethod={paymentMethod} /> : <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
          <main className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-7">
            {step === 1 ? <><div className="mb-6"><h2 className="flex items-center gap-2 text-xl font-black"><Truck className="h-5 w-5 text-[#B76E79]" />{t('checkout.step_address')}</h2><p className="mt-1 text-sm text-gray-500">{t('checkout.delivery_intro')}</p></div><AddressForm value={address} onChange={setAddress} errors={addressErrors} /><div className="mt-5 flex items-center justify-between rounded-2xl bg-rose-50 p-4"><span><strong className="block text-sm text-gray-800">{t('checkout.delivery_to', { place: address.district })}</strong><span className="text-xs text-gray-500">{deliveryLoading ? t('checkout.calculating') : address.province}</span></span><strong className="text-[#B76E79]">{deliveryLoading ? '—' : formatRWF(finalDelivery)}</strong></div><button type="button" onClick={() => { if (addressValid) { trackAddressCompleted(address.district); setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }) } }} disabled={!addressValid} className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#B76E79] text-base font-black text-white disabled:opacity-40">{t('checkout.step_payment')} <ChevronRight className="h-4 w-4" /></button></> : <><div className="mb-6"><h2 className="text-xl font-black">{t('checkout.choose_payment')}</h2><p className="mt-1 text-sm text-gray-500">{t('checkout.mtn_fastest')}</p></div><PaymentSelector method={paymentMethod} onMethodChange={(nextMethod) => { if (nextMethod !== paymentMethod) { trackPaymentSelected(nextMethod); setPendingOrder(null); polling.reset(); setCheckoutError(null) } setPaymentMethod(nextMethod) }} phone={paymentPhone} onPhoneChange={setPaymentPhone} isKigali={address.province === 'Kigali City'} paymentStatus={placing ? 'initiating' : polling.status} total={formatRWF(total)} remaining={polling.remaining} onRetry={() => { polling.reset(); setCheckoutError(null) }} onCancel={() => { polling.reset(); setCheckoutError(null) }} />{!momoValid && <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-red-700" role="alert"><AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{t('checkout.valid_network_number', { network: paymentMethod === 'MTN_MOMO' ? 'MTN (078/079)' : 'Airtel (072/073)' })}</p>}{checkoutError && <p className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert" aria-live="assertive"><AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />{checkoutError}</p>}<div className="mt-6 flex flex-col gap-3 sm:flex-row"><button type="button" onClick={() => setStep(1)} disabled={placing || polling.status === 'polling'} className="min-h-12 flex-1 rounded-xl border border-gray-200 text-base font-bold">{t('common.back')}</button><button type="button" onClick={placeOrder} disabled={placing || polling.status === 'polling' || !momoValid} className={`min-h-12 flex-[2] rounded-xl px-4 text-base font-black shadow-lg disabled:opacity-50 ${paymentMethod === 'MTN_MOMO' ? 'bg-[#FFD200] text-[#1a1a1a] shadow-yellow-200' : 'bg-[#B76E79] text-white shadow-rose-100'}`}>{placing || polling.status === 'polling' ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{polling.status === 'polling' ? t('checkout.approve_on_phone') : t('checkout.creating_order')}</span> : paymentMethod === 'COD' ? t('checkout.place_order_amount', { amount: formatRWF(total) }) : t('checkout.pay_amount', { amount: formatRWF(total) })}</button></div><p className="mt-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />{t('checkout.rwanda_payment_security')}</p></>}
          </main>
          <details className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:hidden">
            <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-semibold text-gray-800">
              <span>{t('checkout.order_summary')}</span>
              <span className="shrink-0 font-black text-[#B76E79]">{formatRWF(total)}</span>
            </summary>
            <div className="border-t border-gray-100 p-3">
              <OrderSummary items={items} subtotal={subtotal} discount={discount} deliveryFee={finalDelivery} total={total} couponCode={appliedCoupon?.code} />
            </div>
          </details>
          <aside className="hidden lg:sticky lg:top-40 lg:block"><OrderSummary items={items} subtotal={subtotal} discount={discount} deliveryFee={finalDelivery} total={total} couponCode={appliedCoupon?.code} /></aside>
        </div>}
      </div>
    </div>
  )
}
