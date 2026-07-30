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

/**
 * Motion configuration. Every timing the carousel uses lives here so the
 * cadence can be retuned without hunting through the component.
 */
const SLIDE_INTERVAL_MS = 5000      // slide display time, transition included
const TRANSITION_MS = 1200          // incoming reveal
const CLICK_LOCKOUT_MS = 1000       // rejects rapid double-navigation
const MANUAL_PAUSE_MS = 6000        // autoplay rest after manual navigation
const HOVER_RESUME_MS = 1500        // grace period after the pointer leaves

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
  /** Slide leaving the viewport, so it can play the exit animation. */
  const [previousIndex, setPreviousIndex] = useState(-1)
  /**
   * Bumped on every change so the active <img> is re-keyed and React remounts
   * it. Without this the Ken Burns animation would only ever run once.
   */
  const [cycle, setCycle] = useState(0)
  const [interactionPaused, setInteractionPaused] = useState(false)
  /** Entry side of the incoming frame: forward enters from the right. */
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  /** True while a reveal is playing, so overlapping navigation is rejected. */
  const [isTransitioning, setIsTransitioning] = useState(false)
  const touchStartX = useRef(0)
  const lockTimer = useRef<number | null>(null)
  const resumeTimer = useRef<number | null>(null)
  const transitioningRef = useRef(false)

  /**
   * Single entry point for every slide change: autoplay, arrows, dots, swipe
   * and keyboard all route through here, so there is one lock and one
   * direction source. Rejected clicks are dropped rather than queued, which
   * avoids the catch-up stutter that queueing produces.
   */
  const goTo = useCallback((resolveNext: (value: number) => number, heading: 'forward' | 'backward') => {
    if (transitioningRef.current) return
    setCurrent((value) => {
      const target = resolveNext(value)
      if (target === value) return value
      transitioningRef.current = true
      setIsTransitioning(true)
      setDirection(heading)
      setPreviousIndex(value)
      setCycle((count) => count + 1)
      return target
    })
  }, [])

  // Release the navigation lock once the reveal has finished.
  useEffect(() => {
    if (!isTransitioning) return
    lockTimer.current = window.setTimeout(() => {
      transitioningRef.current = false
      setIsTransitioning(false)
      setPreviousIndex(-1)
    }, Math.max(TRANSITION_MS, CLICK_LOCKOUT_MS))
    return () => { if (lockTimer.current) window.clearTimeout(lockTimer.current) }
  }, [isTransitioning, cycle])

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
    goTo((value) => (total > 1 ? (value + 1) % total : value), 'forward')
  }, [goTo, total])

  const previous = useCallback(() => {
    goTo((value) => (total > 1 ? (value - 1 + total) % total : value), 'backward')
  }, [goTo, total])

  /** Manual navigation rests autoplay briefly so the visitor keeps control. */
  const restAutoplay = useCallback(() => {
    setInteractionPaused(true)
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current)
    resumeTimer.current = window.setTimeout(() => setInteractionPaused(false), MANUAL_PAUSE_MS)
  }, [])

  const manualNext = useCallback(() => { restAutoplay(); next() }, [next, restAutoplay])
  const manualPrevious = useCallback(() => { restAutoplay(); previous() }, [previous, restAutoplay])

  const selectSlide = useCallback((index: number) => {
    restAutoplay()
    setCurrent((value) => {
      goTo(() => index, index > value ? 'forward' : 'backward')
      return value
    })
  }, [goTo, restAutoplay])

  const pauseOnPointer = useCallback(() => {
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current)
    setInteractionPaused(true)
  }, [])

  const resumeAfterPointer = useCallback(() => {
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current)
    resumeTimer.current = window.setTimeout(() => setInteractionPaused(false), HOVER_RESUME_MS)
  }, [])

  useEffect(() => {
    if (prefersReducedMotion || interactionPaused || total < 2) return
    const timer = window.setInterval(next, SLIDE_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [cycle, interactionPaused, next, prefersReducedMotion, total])

  // Page Visibility: a hidden tab must not queue a burst of transitions.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        setInteractionPaused(true)
      } else {
        transitioningRef.current = false
        setIsTransitioning(false)
        setPreviousIndex(-1)
        setInteractionPaused(false)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // Clear every pending timer if the page navigates away mid-transition.
  useEffect(() => () => {
    if (lockTimer.current) window.clearTimeout(lockTimer.current)
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current)
  }, [])

  useEffect(() => {
    if (current >= total) setCurrent(0)
  }, [current, total])

  // Warm the next frame while the current one is on screen so the transition
  // never waits on a decode.
  useEffect(() => {
    if (total < 2) return
    const upcoming = slides[(current + 1) % total]
    if (!upcoming) return
    const preload = new window.Image()
    preload.src = upcoming
  }, [current, slides, total])

  if (total === 0) return null

  return (
    <section
      role="region"
      aria-label="Product catalog banner"
      aria-roledescription="carousel"
      className="custom-banner-slider group relative left-1/2 h-[380px] w-screen -translate-x-1/2 overflow-hidden bg-gray-100 shadow-sm sm:h-[480px] lg:h-[65vh] lg:max-h-[650px] lg:min-h-[500px]"
      onMouseEnter={pauseOnPointer}
      onMouseLeave={resumeAfterPointer}
      onFocusCapture={pauseOnPointer}
      onBlurCapture={resumeAfterPointer}
      onTouchStart={(event) => { touchStartX.current = event.touches[0].clientX }}
      onTouchEnd={(event) => {
        const distance = touchStartX.current - event.changedTouches[0].clientX
        if (Math.abs(distance) > SWIPE_THRESHOLD_PX) {
          if (distance > 0) manualNext()
          else manualPrevious()
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') { event.preventDefault(); manualNext() }
        if (event.key === 'ArrowLeft') { event.preventDefault(); manualPrevious() }
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
          className={`custom-banner-slider__slide absolute inset-0 will-change-transform ${
            index === current
              ? `${direction === 'backward' ? 'custom-banner-slider__slide--enter-back' : 'custom-banner-slider__slide--enter'} z-10`
              : index === previousIndex
                ? 'custom-banner-slider__slide--exit pointer-events-none z-0'
                : 'pointer-events-none z-0 opacity-0'
          }`}
        >
          {/* Plain <img>: these are operator-supplied static files, mirroring how
              ProductCard and HeroBanner serve their images.
              The key changes on every activation so React remounts the element
              and the Ken Burns animation restarts instead of running only once. */}
          <img
            key={index === current ? `${source}-${cycle}` : source}
            src={source}
            alt=""
            loading={index === 0 ? 'eager' : 'lazy'}
            decoding="async"
            className={`custom-banner-slider__image h-full w-full object-cover ${
              index === current ? `custom-banner-slider__image--cam-${(index % 5) + 1} will-change-transform` : ''
            }`}
          />

          <span className="custom-banner-slider__sweep" aria-hidden="true" />

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
          onPrevious={manualPrevious}
          onNext={manualNext}
          previousLabel="Previous slide"
          nextLabel="Next slide"
        />
      )}

      <CustomBannerDots
        count={total}
        current={current}
        onSelect={selectSlide}
        cycle={cycle}
        paused={interactionPaused}
        label={(index) => `Show slide ${index + 1}`}
      />

      <span className="sr-only" aria-live="polite">{`Slide ${current + 1} of ${total}`}</span>
    </section>
  )
}
