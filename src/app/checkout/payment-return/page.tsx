'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Loader2, XCircle } from 'lucide-react'
import ConfirmationView from '@/components/checkout/ConfirmationView'
import type { CheckoutAddress } from '@/components/checkout/AddressForm'
import type { CheckoutPaymentMethod } from '@/components/checkout/PaymentSelector'
import { useStore } from '@/store/useStore'
import { useT } from '@/lib/i18n/LanguageContext'

interface Result {
  status: string
  order?: { id: string; orderNumber: string; total: number }
  payment?: { method?: string; failureReason?: string | null }
}
const emptyAddress: CheckoutAddress = { fullName: '', phone: '', email: '', province: '', district: '', sector: '', cell: '', village: '', landmark: '', address: '' }

export default function PaymentReturnPage() { return <Suspense fallback={<Loading />}><PaymentResult /></Suspense> }

function PaymentResult() {
  const t = useT()
  const params = useSearchParams()
  const paymentId = params.get('paymentId')
  const clearCart = useStore((state) => state.clearCart)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!paymentId) { setError(true); return }
    let stopped = false
    let attempts = 0
    const check = async () => {
      try {
        const response = await fetch(`/api/payments/status/${encodeURIComponent(paymentId)}`, { cache: 'no-store' })
        const data = await response.json()
        if (!response.ok) throw new Error()
        if (stopped) return
        setResult(data)
        if (data.status === 'PAID') { clearCart(); return }
        if (data.status === 'FAILED') return
        attempts += 1
        if (attempts < 60) window.setTimeout(check, 3000)
        else setError(true)
      } catch { if (!stopped) setError(true) }
    }
    void check()
    return () => { stopped = true }
  }, [clearCart, paymentId])

  if (error) return <StateCard title={t('confirmation.verification_attention')} message={t('confirmation.verification_attention_hint')} />
  if (!result || result.status === 'PENDING') return <Loading />
  if (result.status === 'FAILED') return <StateCard title={t('confirmation.payment_not_completed')} message={t('checkout.payment_failed_recovery')} />
  if (!result.order) return <StateCard title={t('confirmation.verification_attention')} message={t('confirmation.order_details_unavailable')} />
  const method = (result.payment?.method || 'CARD') as CheckoutPaymentMethod
  return <main className="min-h-[65vh] bg-[#f8f9fa] px-4 py-10"><ConfirmationView order={{ ...result.order, items: [] }} address={emptyAddress} paymentMethod={method} /></main>
}

function Loading() { const t = useT(); return <main className="grid min-h-[65vh] place-items-center bg-[#f8f9fa] px-4"><div className="text-center"><Loader2 className="mx-auto h-10 w-10 animate-spin text-[#B76E79]" /><h1 className="mt-4 text-xl font-black">{t('confirmation.confirming_payment')}</h1><p className="mt-2 text-sm text-gray-500">{t('confirmation.keep_open')}</p></div></main> }
function StateCard({ title, message }: { title: string; message: string }) { const t = useT(); return <main className="grid min-h-[65vh] place-items-center bg-[#f8f9fa] px-4"><div className="max-w-lg rounded-[2rem] bg-white p-8 text-center shadow-xl"><XCircle className="mx-auto h-14 w-14 text-red-500" /><h1 className="mt-4 text-2xl font-black">{title}</h1><p className="mt-2 text-sm leading-6 text-gray-500">{message}</p><Link href="/track-order" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-[#1a1a1a] px-5 text-sm font-black text-white">{t('confirmation.track_order')}</Link></div></main> }
