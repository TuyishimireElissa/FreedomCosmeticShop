'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { formatRWF } from '@/lib/format'
import { useStore } from '@/store/useStore'

interface Result {
  status: string
  order?: { orderNumber: string; total: number }
  payment?: { failureReason?: string | null }
}

export default function PaymentReturnPage() {
  return <Suspense fallback={<Loading />}><PaymentResult /></Suspense>
}

function PaymentResult() {
  const params = useSearchParams()
  const paymentId = params.get('paymentId')
  const clearCart = useStore((state) => state.clearCart)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!paymentId) { setError('Missing payment reference'); return }
    let stopped = false
    let attempts = 0
    const check = async () => {
      try {
        const response = await fetch(`/api/payments/status/${encodeURIComponent(paymentId)}`, { cache: 'no-store' })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Unable to verify payment')
        if (stopped) return
        setResult(data)
        if (data.status === 'PAID') { clearCart(); return }
        if (data.status === 'FAILED') return
        attempts += 1
        if (attempts < 60) window.setTimeout(check, 3000)
        else setError('Payment confirmation is taking longer than expected. Check My Orders before trying again.')
      } catch (reason) {
        if (!stopped) setError(reason instanceof Error ? reason.message : 'Unable to verify payment')
      }
    }
    check()
    return () => { stopped = true }
  }, [clearCart, paymentId])

  if (error) return <StateCard error title="Payment verification needs attention" message={error} />
  if (!result || result.status === 'PENDING') return <Loading />
  if (result.status === 'FAILED') return <StateCard error title="Payment was not completed" message={result.payment?.failureReason || 'Please return to checkout or contact support before trying again.'} />
  return <main className="grid min-h-[65vh] place-items-center bg-[#f8f9fa] px-4 py-12"><div className="w-full max-w-lg rounded-[2rem] bg-white p-8 text-center shadow-xl"><CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" /><p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Payment confirmed</p><h1 className="mt-2 text-3xl font-black">Thank you for your order</h1>{result.order&&<div className="mt-6 rounded-2xl bg-gray-50 p-4 text-sm"><p>Order <strong className="font-mono text-[#B76E79]">{result.order.orderNumber}</strong></p><p className="mt-2 text-xl font-black">{formatRWF(result.order.total)}</p></div>}<div className="mt-6 flex flex-col gap-3 sm:flex-row"><Link href="/account/orders" className="flex min-h-11 flex-1 items-center justify-center rounded-full bg-[#B76E79] text-sm font-black text-white">View my orders</Link><Link href="/products" className="flex min-h-11 flex-1 items-center justify-center rounded-full border border-gray-200 text-sm font-black">Continue shopping</Link></div></div></main>
}

function Loading(){return <main className="grid min-h-[65vh] place-items-center bg-[#f8f9fa] px-4"><div className="text-center"><Loader2 className="mx-auto h-10 w-10 animate-spin text-[#B76E79]" /><h1 className="mt-4 text-xl font-black">Confirming your payment</h1><p className="mt-2 text-sm text-gray-500">Please keep this page open.</p></div></main>}
function StateCard({error,title,message}:{error?:boolean;title:string;message:string}){return <main className="grid min-h-[65vh] place-items-center bg-[#f8f9fa] px-4"><div className="max-w-lg rounded-[2rem] bg-white p-8 text-center shadow-xl">{error&&<XCircle className="mx-auto h-14 w-14 text-red-500" />}<h1 className="mt-4 text-2xl font-black">{title}</h1><p className="mt-2 text-sm leading-6 text-gray-500">{message}</p><Link href="/account/orders" className="mt-6 inline-flex rounded-full bg-[#1a1a1a] px-5 py-2.5 text-sm font-black text-white">Check my orders</Link></div></main>}
