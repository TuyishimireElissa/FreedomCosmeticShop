'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import BannerArrows from './BannerArrows'
import CustomBannerDots from './CustomBannerDots'

/**
 * Static promotional slider for /public/images/banner1.jpg … banner5.jpg.
 *
 * Used as the fallback when no CATEGORY_TOP banner is configured in the admin
 * panel. Each file is probed in the browser before it is rendered, so missing
 * files never produce a broken image or an empty box — if none of the five
 * exist the component renders nothing and the page is unchanged.
 *
 * To restyle without editing this file, target the `custom-banner-slider`
 * class names from src/app/globals.css.
 */

/** Change the rotation speed here (milliseconds). */
const SLIDE_INTERVAL_MS = 3000

/** Add or remove entries here to change how many slides the fallback shows. */
const SLIDE_SOURCES = [
  '/images/banner1.jpg',
  '/images/banner2.jpg',
  '/images/banner3.jpg',
  '/images/banner4.jpg',
  '/images/banner5.jpg',
] as const

/**
 * Optional overlay text, keyed by image path. Leave a slide out (or leave this
 * object empty) and that slide shows the image only — no overlay is rendered.
 * Captions animate up into place when their slide becomes active.
 */
const SLIDE_CAPTIONS: Partial<Record<(typeof SLIDE_SOURCES)[number], { title: string; subtitle?: string }>> = {}

const SWIPE_THRESHOLD_PX = 50

/** Resolves true only when the file exists and decodes as an image. */
function probeImage(source: string): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = new window.Image()
    probe.onload = () => resolve(probe.naturalWidth > 0)
    probe.onerror = () => resolve(false)
    probe.src = source
  })
}

export default function CustomBannerSlider() {
  const prefersReducedMotion = useReducedMotion()
  const [slides, setSlides] = useState<string[]>([])
  const [current, setCurrent] = useState(0)
  const [interactionPaused, setInteractionPaused] = useState(false)
  const touchStartX = useRef(0)

  useEffect(() => {
    let active = true
    const resolveAvailable = async () => {
      const results = await Promise.all(SLIDE_SOURCES.map(probeImage))
      if (!active) return
      setSlides(SLIDE_SOURCES.filter((_, index) => results[index]))
    }
    void resolveAvailable()
    return () => { active = false }
  }, [])

  const total = slides.length

  const next = useCallback(() => {
    setCurrent((value) => (total > 1 ? (value + 1) % total : value))
  }, [total])

  const previous = useCallback(() => {
    setCurrent((value) => (total > 1 ? (value - 1 + total) % total : value))
  }, [total])

  useEffect(() => {
    if (prefersReducedMotion || interactionPaused || total < 2) return
    const timer = window.setInterval(next, SLIDE_INTERVAL_MS)
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
      className="custom-banner-slider group relative left-1/2 mb-4 h-[280px] w-screen -translate-x-1/2 overflow-hidden bg-gray-100 shadow-sm sm:h-[420px] lg:h-[60vh] lg:max-h-[600px] lg:min-h-[500px]"
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
      {slides.map((source, index) => (
        <div
          key={source}
          id={`promo-slide-${index}`}
          role="tabpanel"
          aria-hidden={index !== current}
          aria-roledescription="slide"
          aria-label={`Slide ${index + 1} of ${total}`}
          className={`custom-banner-slider__slide absolute inset-0 transition-opacity duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none ${index === current ? 'z-10 opacity-100' : 'pointer-events-none z-0 opacity-0'}`}
        >
          {/* Plain <img>: these are operator-supplied static files, mirroring how
              ProductCard and HeroBanner serve their images. */}
          <img
            src={source}
            alt=""
            loading={index === 0 ? 'eager' : 'lazy'}
            decoding="async"
            className={`custom-banner-slider__image h-full w-full object-cover will-change-transform ${index === current ? 'custom-banner-slider__image--active' : ''}`}
          />

          {SLIDE_CAPTIONS[source] && (
            <>
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent"
              />
              <div
                className={`custom-banner-slider__caption absolute inset-0 z-10 flex flex-col items-start justify-center gap-2 px-6 sm:px-10 md:px-16 ${index === current ? 'custom-banner-slider__caption--active' : 'opacity-0'}`}
              >
                <h2 className="max-w-xl text-xl font-black leading-tight tracking-tight text-white drop-shadow-lg sm:text-3xl md:text-4xl">
                  {SLIDE_CAPTIONS[source]?.title}
                </h2>
                {SLIDE_CAPTIONS[source]?.subtitle && (
                  <p className="max-w-xl text-sm text-white/90 drop-shadow sm:text-base md:text-lg">
                    {SLIDE_CAPTIONS[source]?.subtitle}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      ))}

      {total > 1 && (
        <BannerArrows
          onPrevious={previous}
          onNext={next}
          previousLabel="Previous slide"
          nextLabel="Next slide"
        />
      )}

      <CustomBannerDots
        count={total}
        current={current}
        onSelect={setCurrent}
        label={(index) => `Show slide ${index + 1}`}
      />

      <span className="sr-only" aria-live="polite">{`${current + 1} / ${total}`}</span>
    </section>
  )
}
