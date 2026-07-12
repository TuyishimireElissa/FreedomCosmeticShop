'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, RefreshCw, Store, Users } from 'lucide-react'
import { useStore } from '@/store/useStore'

interface WholesaleBenefit {
  icon: string
  title: string
  desc: string
}

interface WholesaleInfo {
  minimumOrder: number
  minimumOrderFormatted: string
  maxDiscount: number
  benefits: WholesaleBenefit[]
}

export function WholesaleBanner() {
  const { user, setView } = useStore()
  const [info, setInfo] = useState<WholesaleInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/wholesale/info', { cache: 'no-store' })
      if (!response.ok) throw new Error('Wholesale information is unavailable')
      setInfo(await response.json())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load wholesale information')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (user?.wholesaleStatus === 'APPROVED' && (user.userType === 'WHOLESALE' || user.userType === 'BOTH')) return null

  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#1a1a1a] px-5 py-9 text-white shadow-2xl shadow-black/15 sm:px-8 sm:py-11 lg:px-12">
        <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full bg-[#B76E79]/30 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-[#FFD700]/10 blur-3xl" />
        <div className="relative grid items-center gap-9 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#FFD700]"><Store className="h-3.5 w-3.5" />Freedom wholesale</span>
            <h2 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">Grow your beauty business with better prices.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-gray-300 sm:text-base">Built for Rwanda&apos;s salons, spas, shops and resellers—with professional support and reliable delivery nationwide.</p>
            {loading ? <div className="mt-5 h-5 w-64 animate-pulse rounded bg-white/10" /> : info ? <p className="mt-5 text-sm font-semibold text-[#e6a6b0]">Save up to {info.maxDiscount}% · Minimum order {info.minimumOrderFormatted}</p> : null}
            <div className="mt-7 flex flex-wrap gap-3">
              <button type="button" onClick={() => setView('wholesale')} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#B76E79] px-6 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#a55d68]">Apply for wholesale <ArrowRight className="h-4 w-4" /></button>
              <span className="inline-flex items-center gap-2 px-2 text-xs text-gray-400"><Users className="h-4 w-4 text-[#FFD700]" />For registered Rwanda businesses</span>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-white/[0.07]" />)}</div>
          ) : error ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 text-center"><p className="text-sm font-semibold">Wholesale benefits could not be loaded.</p><button type="button" onClick={load} className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-[#e6a6b0]"><RefreshCw className="h-3.5 w-3.5" />Retry details</button></div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {info?.benefits.slice(0, 6).map((benefit) => <div key={benefit.title} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur"><span className="text-2xl" aria-hidden="true">{benefit.icon}</span><h3 className="mt-2 text-xs font-bold sm:text-sm">{benefit.title}</h3><p className="mt-1 hidden text-[11px] leading-4 text-gray-400 sm:block">{benefit.desc}</p></div>)}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
