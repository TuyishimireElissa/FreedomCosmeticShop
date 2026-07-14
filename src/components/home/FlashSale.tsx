'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, RefreshCw, Zap } from 'lucide-react'
import type { Product } from '@/lib/types'
import { ProductCard } from '@/components/storefront/ProductCard'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/i18n/LanguageContext'

interface FlashSaleProps {
  products?: Product[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

export function FlashSale({ products = [], loading = false, error, onRetry }: FlashSaleProps) {
  const t = useT()
  const router = useRouter()
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const end = new Date(now)
      end.setHours(23, 59, 59, 999)
      const difference = Math.max(0, end.getTime() - now.getTime())
      setTimeLeft({
        hours: Math.floor(difference / 3_600_000),
        minutes: Math.floor((difference % 3_600_000) / 60_000),
        seconds: Math.floor((difference % 60_000) / 1_000),
      })
    }
    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [])

  const saleProducts = products.filter((product) => product.compareAt && product.compareAt > product.price).slice(0, 4)
  const pad = (value: number) => String(value).padStart(2, '0')

  return (
    <section className="bg-gradient-to-b from-[#fff8e7] to-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#1a1a1a] text-[#FFD700] shadow-lg"><Zap className="h-6 w-6 fill-current" /></span>
            <div><span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-amber-700">{t('home.today_only')}</span><h2 className="mt-1 text-2xl font-black text-[#1a1a1a] sm:text-3xl">{t('home.flash_sale')}</h2><p className="mt-1 text-sm text-gray-500">{t('home.flash_subtitle')}</p></div>
          </div>
          <div className="flex items-center gap-2"><span className="mr-1 text-xs font-bold uppercase tracking-wider text-gray-500">{t('home.ends_in')}</span>{[pad(timeLeft.hours), pad(timeLeft.minutes), pad(timeLeft.seconds)].map((value, index) => <span key={index} className="flex items-center gap-2"><span className="grid h-11 min-w-11 place-items-center rounded-xl bg-[#1a1a1a] px-2 font-mono text-lg font-black text-white shadow-md">{value}</span>{index < 2 && <span className="font-black text-[#B76E79]">:</span>}</span>)}</div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">{[0, 1, 2, 3].map((index) => <div key={index} className="aspect-[3/4] animate-pulse rounded-2xl bg-white shadow-sm" />)}</div>
        ) : error ? (
          <div className="rounded-3xl border border-dashed border-amber-200 bg-white px-5 py-10 text-center"><p className="text-sm font-semibold text-gray-800">{t('home.sale_load_failed')}</p>{onRetry && <button type="button" onClick={onRetry} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1a1a1a] px-4 py-2 text-xs font-bold text-white"><RefreshCw className="h-3.5 w-3.5" />{t('home.retry_sale')}</button>}</div>
        ) : saleProducts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-amber-200 bg-white px-5 py-10 text-center"><Zap className="mx-auto h-8 w-8 text-amber-400" /><p className="mt-3 text-sm font-semibold text-gray-700">{t('home.next_sale_preparing')}</p><button type="button" onClick={() => router.push('/products')} className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-[#B76E79]">{t('home.browse_offers')} <ArrowRight className="h-3.5 w-3.5" /></button></div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">{saleProducts.map((product) => <ProductCard key={product.id} product={product} />)}</div>
        )}
      </div>
    </section>
  )
}
