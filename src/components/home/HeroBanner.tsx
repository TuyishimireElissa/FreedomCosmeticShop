'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play, RefreshCw, ShieldCheck, Sparkles, Truck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/i18n/LanguageContext'
import IconButton from '@/components/a11y/IconButton'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useLowData } from '@/contexts/LowDataContext'
import { IMAGE_QUALITY, IMAGE_SIZES, optimizeCloudinaryUrl } from '@/lib/cloudinary-images'

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
  const t = useT()
  const router = useRouter()
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const [interactionPaused, setInteractionPaused] = useState(false)
  const [reducedMotionOverride, setReducedMotionOverride] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const { isLowData } = useLowData()
  const reducedMotionPause = prefersReducedMotion && !reducedMotionOverride
  const controlPaused = isLowData || paused || reducedMotionPause
  const autoAdvancePaused = controlPaused || interactionPaused

  const next = useCallback(() => {
    if (banners.length > 1) setCurrent((value) => (value + 1) % banners.length)
  }, [banners.length])

  const previous = () => {
    if (banners.length > 1) setCurrent((value) => (value - 1 + banners.length) % banners.length)
  }

  const togglePlayback = () => {
    if (isLowData) return
    if (reducedMotionPause) {
      setReducedMotionOverride(true)
      setPaused(false)
    } else {
      setPaused((value) => !value)
    }
  }

  useEffect(() => {
    if (autoAdvancePaused || banners.length < 2) return
    const timer = window.setInterval(next, AUTO_ADVANCE_MS)
    return () => window.clearInterval(timer)
  }, [autoAdvancePaused, banners.length, next])

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
      <section className="relative min-h-[300px] overflow-hidden bg-[#f4e8ea] sm:min-h-[320px] md:min-h-[480px] lg:min-h-[560px]" aria-label={t('home.loading_promotions')}>
        <div className={`absolute inset-0 bg-gradient-to-br from-[#f8edef] via-[#f4dfe3] to-[#ead0d5] ${isLowData ? '' : 'animate-pulse'}`} />
        <div className="relative mx-auto flex min-h-[300px] max-w-7xl items-center px-4 sm:min-h-[320px] sm:px-6 md:min-h-[480px] lg:min-h-[560px] lg:px-8">
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
      <section className="relative overflow-hidden bg-gradient-to-br from-[#251d1f] via-[#4b3035] to-[#B76E79] min-h-[300px] px-4 py-12 text-white sm:min-h-[320px] sm:px-6 md:min-h-[480px] md:py-20 lg:min-h-[560px] lg:px-8">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#FFD700]/10 blur-3xl" />
        <div className="relative mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em]"><Sparkles className="h-4 w-4 text-[#FFD700]" />{t('home.rwanda_beauty_destination')}</span>
          <h1 className="mt-4 text-2xl font-black leading-tight md:text-4xl lg:text-5xl">{t('home.hero_title')}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">{t('home.hero_subtitle')}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => router.push('/products')} className="inline-flex items-center gap-2 rounded-full bg-[#B76E79] px-6 py-3 text-sm font-bold text-white shadow-xl hover:bg-[#a55d68]">{t('home.shop_collection')} <ArrowRight className="h-4 w-4" /></button>
            {onRetry && <button type="button" onClick={onRetry} className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold backdrop-blur hover:bg-white/15"><RefreshCw className="h-4 w-4" />{t('home.retry_banners')}</button>}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      className="relative overflow-hidden bg-[#1a1a1a]"
      onMouseEnter={() => setInteractionPaused(true)}
      onMouseLeave={() => setInteractionPaused(false)}
      onFocusCapture={() => setInteractionPaused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setInteractionPaused(false) }}
      aria-roledescription="carousel"
      aria-label={t('home.featured_campaigns')}
    >
      {isLowData && (
        <p id="hero-low-data-status" className="absolute right-3 top-3 z-30 rounded-full border border-white/25 bg-black/75 px-3 py-2 text-xs font-semibold text-white">
          {t('low_data.carousel_paused')}
        </p>
      )}
      <div className="relative h-[300px] sm:h-[320px] md:h-[480px] lg:h-[560px]">
        {banners.map((banner, index) => {
          const active = index === current
          const lowDataImage = optimizeCloudinaryUrl(banner.mobileImage || banner.image, {
            width: IMAGE_SIZES.hero.lowData,
            quality: IMAGE_QUALITY.lowData,
          })
          const mobileImage = banner.mobileImage
            ? optimizeCloudinaryUrl(banner.mobileImage, { width: IMAGE_SIZES.hero.mobile })
            : null
          const desktopImage = optimizeCloudinaryUrl(banner.image, { width: IMAGE_SIZES.hero.desktop })
          return (
            <article
              key={banner.id}
              id={`hero-slide-${index}`}
              role="group"
              aria-roledescription="slide"
              aria-label={t('accessibility.slide_position', { current: index + 1, total: banners.length })}
              aria-hidden={!active}
              inert={active ? undefined : true}
              className={`absolute inset-0 transition-all duration-700 ${active ? 'z-10 opacity-100' : 'pointer-events-none z-0 opacity-0'}`}
            >
              {(!isLowData || active) && (
                <>
                  {isLowData ? (
                    <img
                      src={lowDataImage}
                      alt=""
                      loading={index === 0 ? 'eager' : 'lazy'}
                      fetchPriority={index === 0 ? 'high' : 'auto'}
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <picture className="absolute inset-0 block">
                      {mobileImage && <source media="(max-width: 639px)" srcSet={mobileImage} />}
                      <img src={desktopImage} alt="" loading={index === 0 ? 'eager' : 'lazy'} fetchPriority={index === 0 ? 'high' : 'auto'} decoding="async" className={`h-full w-full object-cover transition-transform duration-500 ease-out md:duration-[7000ms] ${active ? 'md:scale-105' : 'scale-100'}`} />
                    </picture>
                  )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/10" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />

              <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl text-white md:pt-6">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] backdrop-blur sm:text-xs"><Sparkles className="h-3.5 w-3.5 text-[#FFD700]" />{t('home.premium_for_rwanda')}</span>
                  <h1 className="mt-3 max-w-xl text-2xl font-black leading-tight tracking-tight md:mt-5 md:text-4xl lg:text-5xl">{banner.title}</h1>
                  {banner.subtitle && <p className="mt-2 line-clamp-2 max-w-xl text-sm leading-5 text-white/80 md:mt-4 md:line-clamp-none md:text-base md:leading-6 lg:text-lg">{banner.subtitle}</p>}
                  <div className="mt-4 flex flex-wrap gap-2 md:mt-7 md:gap-3">
                    <button type="button" onClick={() => followBanner(banner)} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#B76E79] px-6 text-sm font-bold text-white shadow-xl shadow-black/20 transition-all hover:-translate-y-0.5 hover:bg-[#a55d68]">{t('home.shop_now')} <ArrowRight className="h-4 w-4" /></button>
                    <button type="button" onClick={() => router.push('/products')} className="inline-flex min-h-12 items-center rounded-full border border-white/30 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20">{t('home.explore_best_sellers')}</button>
                  </div>
                  <div className="mt-4 hidden flex-wrap gap-x-5 gap-y-2 sm:flex md:mt-7 text-xs font-medium text-white/80 sm:text-xs">
                    <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-400" />{t('footer.genuine')}</span>
                    <span className="flex items-center gap-1.5"><Truck className="h-4 w-4 text-[#FFD700]" />{t('footer.all_districts')}</span>
                    <span>💛 MTN MoMo</span>
                  </div>
                </div>
              </div>
                </>
              )}
            </article>
          )
        })}
      </div>

      {banners.length > 1 && (
        <>
          <IconButton label={t('home.previous_banner')} icon={<ChevronLeft className="h-5 w-5" />} onClick={previous} className="absolute left-3 top-1/2 z-20 hidden -translate-y-1/2 border border-white/20 bg-black/20 text-white backdrop-blur hover:bg-black/40 sm:inline-flex lg:left-6" />
          <IconButton label={t('home.next_banner')} icon={<ChevronRight className="h-5 w-5" />} onClick={next} className="absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 border border-white/20 bg-black/20 text-white backdrop-blur hover:bg-black/40 sm:inline-flex lg:right-6" />
          <div className="absolute bottom-2 left-1/2 z-20 flex max-w-[calc(100%-7rem)] -translate-x-1/2 items-center gap-0.5 overflow-x-auto rounded-full bg-black/30 px-2 backdrop-blur md:bottom-5" role="tablist" aria-label={t('home.featured_campaigns')}>
            {banners.map((banner, index) => <button key={banner.id} type="button" role="tab" onClick={() => setCurrent(index)} className="grid h-11 w-11 place-items-center rounded-full" aria-label={t('home.show_banner', { number: index + 1 })} aria-selected={index === current} aria-controls={`hero-slide-${index}`}><span aria-hidden="true" className={`h-2 rounded-full transition-all ${index === current ? 'w-7 bg-[#B76E79]' : 'w-2 bg-white/60'}`} /></button>)}
          </div>
          <IconButton label={controlPaused ? t('accessibility.play_carousel') : t('accessibility.pause_carousel')} icon={controlPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />} onClick={togglePlayback} disabled={isLowData} aria-describedby={isLowData ? 'hero-low-data-status' : undefined} className="absolute bottom-2 right-3 z-20 border border-white/20 bg-black/30 text-white backdrop-blur hover:bg-black/50 md:bottom-5 md:right-6" />
          <div className="sr-only" aria-live="polite" aria-atomic="true">{t('accessibility.slide_position', { current: current + 1, total: banners.length })}</div>
        </>
      )}
    </section>
  )
}
