'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useT } from '@/lib/i18n/LanguageContext'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import BannerArrows from './BannerArrows'
import BannerDots from './BannerDots'
import BannerSlide, { type PromoBanner } from './BannerSlide'

interface BannerCarouselProps {
  placement?: string
}

const AUTO_ADVANCE_MS = 3000
const MAX_SLIDES = 5
const SWIPE_THRESHOLD_PX = 50

function isRenderableBanner(value: unknown): value is PromoBanner {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.id === 'string'
    && typeof candidate.title === 'string'
    && typeof candidate.image === 'string'
    && candidate.image.trim().length > 0
}

function toPromoBanner(value: PromoBanner): PromoBanner {
  return {
    id: value.id,
    title: value.title,
    subtitle: typeof value.subtitle === 'string' ? value.subtitle : null,
    image: value.image,
    mobileImage: typeof value.mobileImage === 'string' ? value.mobileImage : null,
    linkType: typeof value.linkType === 'string' ? value.linkType : null,
    linkUrl: typeof value.linkUrl === 'string' ? value.linkUrl : null,
    textPosition: typeof value.textPosition === 'string' ? value.textPosition : null,
    textColor: typeof value.textColor === 'string' ? value.textColor : null,
  }
}

/**
 * Auto-rotating promotional carousel.
 *
 * Renders nothing at all until active slides are confirmed, so a page with no
 * configured banners looks exactly as it did before this component existed —
 * no skeleton, no empty box, no layout shift.
 */
export default function BannerCarousel({ placement = 'CATEGORY_TOP' }: BannerCarouselProps) {
  const t = useT()
  const prefersReducedMotion = useReducedMotion()
  const [banners, setBanners] = useState<PromoBanner[]>([])
  const [current, setCurrent] = useState(0)
  const [interactionPaused, setInteractionPaused] = useState(false)
  const touchStartX = useRef(0)

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    const load = async () => {
      try {
        const response = await fetch(`/api/banners?placement=${encodeURIComponent(placement)}`, { signal: controller.signal })
        if (!response.ok) return
        const payload: unknown = await response.json()
        const rows = typeof payload === 'object' && payload !== null && 'banners' in payload
          ? (payload as { banners: unknown }).banners
          : null
        if (!Array.isArray(rows) || !active) return
        setBanners(rows.filter(isRenderableBanner).slice(0, MAX_SLIDES).map(toPromoBanner))
      } catch {
        // A failed banner fetch must never disturb the page: stay empty and silent.
      }
    }

    void load()
    return () => {
      active = false
      controller.abort()
    }
  }, [placement])

  const total = banners.length

  const next = useCallback(() => {
    setCurrent((value) => (total > 1 ? (value + 1) % total : value))
  }, [total])

  const previous = useCallback(() => {
    setCurrent((value) => (total > 1 ? (value - 1 + total) % total : value))
  }, [total])

  useEffect(() => {
    if (prefersReducedMotion || interactionPaused || total < 2) return
    const timer = window.setInterval(next, AUTO_ADVANCE_MS)
    return () => window.clearInterval(timer)
  }, [interactionPaused, next, prefersReducedMotion, total])

  useEffect(() => {
    if (current >= total) setCurrent(0)
  }, [current, total])

  if (total === 0) return null

  return (
    <section
      aria-label="Promotions"
      aria-roledescription="carousel"
      className="group relative mb-4 aspect-[16/7] w-full overflow-hidden rounded-2xl bg-gray-100 shadow-sm sm:aspect-[3/1] lg:aspect-[1000/280]"
      onMouseEnter={() => setInteractionPaused(true)}
      onMouseLeave={() => setInteractionPaused(false)}
      onFocusCapture={() => setInteractionPaused(true)}
      onBlurCapture={() => setInteractionPaused(false)}
      onTouchStart={(event) => { touchStartX.current = event.touches[0].clientX }}
      onTouchEnd={(event) => {
        const distance = touchStartX.current - event.changedTouches[0].clientX
        if (Math.abs(distance) > SWIPE_THRESHOLD_PX) {
          if (distance > 0) next()
          else previous()
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') { event.preventDefault(); next() }
        if (event.key === 'ArrowLeft') { event.preventDefault(); previous() }
      }}
      tabIndex={0}
    >
      {banners.map((banner, index) => (
        <BannerSlide
          key={banner.id}
          banner={banner}
          index={index}
          isActive={index === current}
          priority={index === 0}
          ctaLabel={t('home.shop_now')}
        />
      ))}

      {total > 1 && (
        <BannerArrows
          onPrevious={previous}
          onNext={next}
          previousLabel={t('product.previous_image')}
          nextLabel={t('product.next_image')}
        />
      )}

      <BannerDots
        count={total}
        current={current}
        onSelect={setCurrent}
        label={(index) => t('home.show_banner', { number: index + 1 })}
      />

      <span className="sr-only" aria-live="polite">{`${current + 1} / ${total}`}</span>
    </section>
  )
}
