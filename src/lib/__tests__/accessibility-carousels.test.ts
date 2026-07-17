import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const reducedMotion = read('src/hooks/useReducedMotion.ts')
const hero = read('src/components/home/HeroBanner.tsx')
const reviews = read('src/components/home/ReviewsCarousel.tsx')
const brands = read('src/components/home/BrandCarousel.tsx')
const css = read('src/app/globals.css')
const english = read('src/lib/i18n/translations/en.ts')
const kinyarwanda = read('src/lib/i18n/translations/rw.ts')

describe('accessible moving content', () => {
  it('tracks reduced-motion changes and removes its listener', () => {
    expect(reducedMotion).toContain("window.matchMedia('(prefers-reduced-motion: reduce)')")
    expect(reducedMotion).toContain("media.addEventListener('change', update)")
    expect(reducedMotion).toContain("media.removeEventListener('change', update)")
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
  })

  it('pauses the hero for user preference, hover, and keyboard focus', () => {
    expect(hero).toContain('const autoAdvancePaused = controlPaused || interactionPaused')
    expect(hero).toContain('if (autoAdvancePaused || banners.length < 2) return')
    expect(hero).toContain('onMouseEnter={() => setInteractionPaused(true)}')
    expect(hero).toContain('onFocusCapture={() => setInteractionPaused(true)}')
    expect(hero).toContain('onBlurCapture=')
    expect(hero).toContain('reducedMotionPause')
  })

  it('provides hero playback, slide, tab, and live-region semantics', () => {
    expect(hero).toContain('aria-roledescription="carousel"')
    expect(hero).toContain('aria-roledescription="slide"')
    expect(hero).toContain('inert={active ? undefined : true}')
    expect(hero).toContain('role="tablist"')
    expect(hero).toContain('role="tab"')
    expect(hero).toContain('aria-selected={index === current}')
    expect(hero).toContain('aria-controls={`hero-slide-${index}`}')
    expect(hero).toContain("t('accessibility.pause_carousel')")
    expect(hero).toContain("t('accessibility.play_carousel')")
    expect(hero).toContain('aria-live="polite"')
    expect(hero).toContain('h-11 w-11')
  })

  it('provides equivalent controls for auto-advancing reviews', () => {
    expect(reviews).toContain('if (autoAdvancePaused || reviews.length < 2) return')
    expect(reviews).toContain('aria-roledescription="carousel"')
    expect(reviews).toContain('aria-roledescription="slide"')
    expect(reviews).toContain('role="tablist"')
    expect(reviews).toContain('role="tab"')
    expect(reviews).toContain("t('accessibility.pause_carousel')")
    expect(reviews).toContain("t('accessibility.play_carousel')")
    expect(reviews).toContain('aria-live="polite"')
  })

  it('keeps brand scrolling operable without dragging and respects reduced motion', () => {
    expect(brands).toContain("behavior: prefersReducedMotion ? \"auto\" : \"smooth\"")
    expect(brands.match(/<IconButton/g)?.length).toBe(2)
    expect(brands).toContain("t('home.scroll_brands_left')")
    expect(brands).toContain("t('home.scroll_brands_right')")
    expect(brands).toContain('<button')
    expect(brands).not.toContain('className="hidden gap-2 sm:flex"')
  })

  it('provides English and verified Kinyarwanda carousel announcements', () => {
    for (const key of ['pause_carousel', 'play_carousel', 'slide_position', 'reviews_carousel']) {
      expect(english).toMatch(new RegExp(`${key}:`))
      expect(kinyarwanda).toMatch(new RegExp(`${key}:.*// verified-rw`))
    }
  })
})
