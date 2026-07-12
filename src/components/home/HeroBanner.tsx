'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, RefreshCw, ShieldCheck, Sparkles, Truck } from 'lucide-react'
import { useRouter } from 'next/navigation'

export interface HomeBanner {
  id: string
  title: string
  subtitle: string | null
  image: string
  mobileImage: string | null
  linkType: string | null
  linkUrl: string | null
  placement: string
}

interface HeroBannerProps {
  banners: HomeBanner[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
}

const AUTO_ADVANCE_MS = 6000

export function HeroBanner({ banners, loading = false, error, onRetry }: HeroBannerProps) {
  const router = useRouter()
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

  const next = useCallback(() => {
    if (banners.length > 1) setCurrent((value) => (value + 1) % banners.length)
  }, [banners.length])

  const previous = () => {
    if (banners.length > 1) setCurrent((value) => (value - 1 + banners.length) % banners.length)
  }

  useEffect(() => {
    if (paused || banners.length < 2) return
    const timer = window.setInterval(next, AUTO_ADVANCE_MS)
    return () => window.clearInterval(timer)
  }, [banners.length, next, paused])

  useEffect(() => {
    if (current >= banners.length) setCurrent(0)
  }, [banners.length, current])

  const followBanner = (banner: HomeBanner) => {
    if (banner.linkType === 'CATEGORY' && banner.linkUrl) router.push(`/products?category=${encodeURIComponent(banner.linkUrl)}`)
    else if (banner.linkType === 'PRODUCT' && banner.linkUrl) router.push(`/products/${encodeURIComponent(banner.linkUrl)}`)
    else if (banner.linkType === 'URL' && banner.linkUrl) window.location.assign(banner.linkUrl)
    else router.push('/products')
  }

  if (loading) {
    return (
      <section className="relative min-h-[520px] overflow-hidden bg-[#f4e8ea] sm:min-h-[570px] lg:min-h-[640px]" aria-label="Loading featured promotions">
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#f8edef] via-[#f4dfe3] to-[#ead0d5]" />
        <div className="relative mx-auto flex min-h-[520px] max-w-7xl items-center px-4 sm:min-h-[570px] sm:px-6 lg:min-h-[640px] lg:px-8">
          <div className="w-full max-w-xl space-y-4">
            <div className="h-7 w-40 animate-pulse rounded-full bg-white/70" />
            <div className="h-12 w-full animate-pulse rounded-xl bg-white/70 sm:h-16" />
            <div className="h-12 w-4/5 animate-pulse rounded-xl bg-white/60" />
            <div className="h-11 w-36 animate-pulse rounded-full bg-[#B76E79]/40" />
          </div>
        </div>
      </section>
    )
  }

  if (error || banners.length === 0) {
    return (
      <section className="relative overflow-hidden bg-gradient-to-br from-[#251d1f] via-[#4b3035] to-[#B76E79] px-4 py-24 text-white sm:px-6 sm:py-28 lg:px-8">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#FFD700]/10 blur-3xl" />
        <div className="relative mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em]"><Sparkles className="h-4 w-4 text-[#FFD700]" />Rwanda&apos;s beauty destination</span>
          <h1 className="mt-6 text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">Authentic beauty, delivered across Rwanda.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">Explore premium skincare, makeup and haircare selected for Rwanda&apos;s climate and melanin-rich skin.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => router.push('/products')} className="inline-flex items-center gap-2 rounded-full bg-[#B76E79] px-6 py-3 text-sm font-bold text-white shadow-xl hover:bg-[#a55d68]">Shop the collection <ArrowRight className="h-4 w-4" /></button>
            {onRetry && <button type="button" onClick={onRetry} className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold backdrop-blur hover:bg-white/15"><RefreshCw className="h-4 w-4" />Retry banners</button>}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="relative overflow-hidden bg-[#1a1a1a]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-roledescription="carousel" aria-label="Featured beauty campaigns">
      <div className="relative h-[520px] sm:h-[570px] lg:h-[640px]">
        {banners.map((banner, index) => {
          const active = index === current
          return (
            <article key={banner.id} className={`absolute inset-0 transition-all duration-700 ${active ? 'z-10 opacity-100' : 'pointer-events-none z-0 opacity-0'}`} aria-hidden={!active}>
              <picture className="absolute inset-0 block">
                {banner.mobileImage && <source media="(max-width: 639px)" srcSet={banner.mobileImage} />}
                <img src={banner.image} alt="" className={`h-full w-full object-cover transition-transform duration-[7000ms] ease-out ${active ? 'scale-105' : 'scale-100'}`} />
              </picture>
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/10" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />

              <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl pt-6 text-white">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] backdrop-blur sm:text-xs"><Sparkles className="h-3.5 w-3.5 text-[#FFD700]" />Premium beauty for Rwanda</span>
                  <h1 className="mt-5 max-w-xl text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">{banner.title}</h1>
                  {banner.subtitle && <p className="mt-4 max-w-xl text-sm leading-6 text-white/80 sm:text-base lg:text-lg">{banner.subtitle}</p>}
                  <div className="mt-7 flex flex-wrap gap-3">
                    <button type="button" onClick={() => followBanner(banner)} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#B76E79] px-6 text-sm font-bold text-white shadow-xl shadow-black/20 transition-all hover:-translate-y-0.5 hover:bg-[#a55d68]">Shop now <ArrowRight className="h-4 w-4" /></button>
                    <button type="button" onClick={() => router.push('/products')} className="inline-flex min-h-12 items-center rounded-full border border-white/30 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20">Explore best sellers</button>
                  </div>
                  <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-medium text-white/80 sm:text-xs">
                    <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-400" />100% genuine</span>
                    <span className="flex items-center gap-1.5"><Truck className="h-4 w-4 text-[#FFD700]" />All 30 districts</span>
                    <span>💛 MTN MoMo</span>
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {banners.length > 1 && (
        <>
          <button type="button" onClick={previous} className="absolute left-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/20 text-white backdrop-blur transition-colors hover:bg-black/40 sm:grid lg:left-6" aria-label="Previous banner"><ChevronLeft className="h-5 w-5" /></button>
          <button type="button" onClick={next} className="absolute right-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/20 text-white backdrop-blur transition-colors hover:bg-black/40 sm:grid lg:right-6" aria-label="Next banner"><ChevronRight className="h-5 w-5" /></button>
          <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/20 px-3 py-2 backdrop-blur">
            {banners.map((banner, index) => <button key={banner.id} type="button" onClick={() => setCurrent(index)} className={`h-2 rounded-full transition-all ${index === current ? 'w-8 bg-[#B76E79]' : 'w-2 bg-white/50 hover:bg-white'}`} aria-label={`Show banner ${index + 1}`} aria-current={index === current} />)}
          </div>
        </>
      )}
    </section>
  )
}
