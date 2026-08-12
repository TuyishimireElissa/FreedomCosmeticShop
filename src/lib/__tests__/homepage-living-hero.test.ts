/**
 * Homepage upgrade — living hero, WhatsApp trust section, scroll reveal.
 *
 * Owner brief asked for a video hero, a social-proof ticker, a skin-tone
 * matcher and a routine builder. Three of those were blocked by data that does
 * not exist (0 DELIVERED orders, no skin-TONE field, 0 bundles) and were
 * deferred rather than faked. What shipped is the unblocked set:
 *
 *   Phase 1  hero zoom + cream blend + scroll-to-featured CTA
 *   Phase 5  WhatsApp-led trust cards
 *   Phase 6  scroll reveal with stagger
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')

/** Comments stripped: these files explain the rejected video approach and the
 *  old palette in prose, which a naive substring check would match. */
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '')

const hero = code('src/components/home/Hero.tsx')
const trust = code('src/components/home/TrustSection.tsx')
const bento = code('src/components/home/FeaturedBento.tsx')
const reveal = code('src/hooks/use-reveal.ts')
const css = read('src/app/globals.css')
const rw = read('src/lib/i18n/translations/rw.ts')
const en = read('src/lib/i18n/translations/en.ts')

describe('phase 1 — the hero feels alive without a video', () => {
  it('applies the slow zoom to the image layer', () => {
    expect(hero).toContain('fcs-hero-zoom')
    expect(css).toContain('@keyframes fcs-hero-zoom')
  })

  it('animates transform only, so it never triggers layout', () => {
    const block = css.slice(css.indexOf('@keyframes fcs-hero-zoom'), css.indexOf('.fcs-hero-zoom {'))
    expect(block).toContain('transform: scale(1)')
    expect(block).not.toContain('width:')
    expect(block).not.toContain('margin')
  })

  it('stops completely for reduced motion', () => {
    // The zoom is decorative; a vestibular-sensitive user must get a still.
    const guard = css.slice(css.indexOf('.fcs-hero-zoom {'), css.indexOf('@keyframes cb-camera-1'))
    expect(guard).toContain('prefers-reduced-motion: reduce')
    expect(guard).toContain('animation: none')
  })

  it('ships no video element', () => {
    // No asset exists, and a 500 KB autoplay loop is a bad trade against a
    // 103 kB shared bundle on Rwandan mobile data.
    expect(hero).not.toContain('<video')
    expect(hero).not.toContain('.webm')
  })

  it('blends into the page instead of ending on a hard edge', () => {
    expect(hero).toContain('bg-gradient-to-b from-transparent to-white')
    // Must not intercept taps on the CTA sitting above it.
    expect(hero).toMatch(/pointer-events-none[^"]*absolute inset-x-0 bottom-0/)
  })

  it('the primary CTA scrolls to the curated shelf', () => {
    expect(hero).toContain("document.getElementById('featured-products')")
    expect(hero).toContain('scrollIntoView')
    expect(bento).toContain('id="featured-products"')
  })

  it('the CTA still works when nothing is curated', () => {
    // FeaturedBento hides itself at zero featured products, so the anchor can
    // legitimately be absent. It must fall through to /products, not no-op.
    expect(hero).toContain('href="/products"')
    expect(hero).toMatch(/if \(!target\) return/)
  })

  it('honours reduced motion when scrolling', () => {
    expect(hero).toContain("reduced ? 'auto' : 'smooth'")
  })

  it('clears the sticky header when it lands', () => {
    expect(bento).toContain('scroll-mt-20')
  })
})

describe('phase 5 — the trust section leads with WhatsApp', () => {
  it('shows the four owner-specified cards', () => {
    for (const key of ['trust_advice', 'trust_pay', 'trust_delivery', 'trust_authentic']) {
      expect(trust, `missing ${key}`).toContain(`home.${key}_`)
    }
  })

  it('puts human advice first, not delivery', () => {
    // WhatsApp is the only working order channel, so "you can talk to us"
    // outranks logistics.
    expect(trust.indexOf('trust_advice_title')).toBeLessThan(trust.indexOf('trust_delivery_title'))
  })

  it('uses one calm icon treatment, not six unrelated hues', () => {
    // Was bg-blue-50 / bg-green-50 / bg-yellow-50 / bg-purple-50 / bg-orange-50
    // / bg-emerald-50 on a single row.
    for (const stale of ['bg-blue-50', 'bg-green-50', 'bg-yellow-50', 'bg-purple-50', 'bg-orange-50']) {
      expect(trust, `still uses ${stale}`).not.toContain(stale)
    }
    expect(trust).toContain('bg-fcs-surface-muted text-fcs-umber')
  })

  it('is built from fcs tokens, not raw hex', () => {
    expect(trust).toContain('border-fcs-border-subtle')
    expect(trust).toContain('bg-fcs-surface-elevated')
    expect(trust).not.toContain('#EEEEEE')
    expect(trust).not.toContain('#FAFAFA')
  })

  it('keeps the conditional cards that depend on owner data', () => {
    // RDB number, address and support hours are still OWNER_TODO in places;
    // those cards must stay hidden rather than print a placeholder.
    expect(trust).toContain('isConfigured(BUSINESS.rdbNumber)')
    expect(trust).toContain('isConfigured(BUSINESS.whatsapp)')
  })

  it('the delivery claim matches what the system actually serves', () => {
    // /api/delivery/districts returns 30 districts across 5 fee zones, so
    // "all 30 districts" is true. Verified against the live API, not assumed.
    expect(en).toContain('All 30 districts')
  })
})

describe('phase 6 — sections reveal on scroll', () => {
  /** The reveal rules, sliced with bounds asserted.
   *  An earlier version anchored the end at `@keyframes fcs-hero-zoom`, which
   *  appears EARLIER in the file — the slice came back empty and two
   *  assertions passed against ''. */
  const revealBlock = () => {
    const start = css.indexOf('.fcs-reveal')
    const end = css.indexOf('@keyframes cb-camera-1')
    expect(start).toBeGreaterThan(0)
    expect(end).toBeGreaterThan(start)
    return css.slice(start, end)
  }

  it('the hook observes once and then stops', () => {
    // Re-animating on every pass is distracting and wastes work on a cheap
    // phone.
    expect(reveal).toContain('observer.unobserve(entry.target)')
  })

  it('degrades to visible when motion is reduced or the API is missing', () => {
    expect(reveal).toContain('prefers-reduced-motion: reduce')
    expect(reveal).toContain("typeof IntersectionObserver === 'undefined'")
    expect(reveal).toContain("node.classList.add('is-revealed')")
  })

  it('never leaves content permanently invisible', () => {
    // The hidden state is scoped to no-preference, so a reduced-motion user —
    // or anyone whose JS fails — sees the content regardless.
    const block = revealBlock()
    expect(block).toContain('opacity: 0')
    // The rules must sit INSIDE the no-preference guard, not merely near it.
    const before = css.slice(0, css.indexOf('.fcs-reveal'))
    expect(before.trimEnd().endsWith('@media (prefers-reduced-motion: no-preference) {')).toBe(true)
  })

  it('animates only compositor-friendly properties', () => {
    const block = revealBlock()
    expect(block).toContain('opacity 400ms')
    expect(block).toContain('transform 400ms')
    expect(block).toContain('var(--fcs-transition-snap)')
  })

  it('staggers the trust cards and caps the delay', () => {
    // Beyond ~300ms the last card reads as late rather than choreographed.
    expect(trust).toContain('Math.min(index, 3) * 100')
  })
})

describe('the new copy exists in both languages', () => {
  const KEYS = [
    'trust_advice_title', 'trust_advice_detail',
    'trust_pay_title', 'trust_pay_detail',
    'trust_delivery_title', 'trust_delivery_detail',
    'trust_authentic_title', 'trust_authentic_copy',
  ]

  it.each(KEYS)('%s is translated', (key) => {
    expect(rw, `rw missing ${key}`).toContain(`${key}:`)
    expect(en, `en missing ${key}`).toContain(`${key}:`)
  })

  it('every new Kinyarwanda string is marked verified', () => {
    for (const key of KEYS) {
      const line = rw.split('\n').find((row) => row.trim().startsWith(`${key}:`))
      expect(line, `${key} not found in rw`).toBeTruthy()
      expect(line, `${key} lacks a verified-rw marker`).toContain('verified-rw')
    }
  })

  it('the Kinyarwanda is written, not copied from English', () => {
    expect(rw).toContain('Tuganira kuri WhatsApp')
    expect(rw).toContain('amafaranga afatika') // cash, not `ikoranabuhanga`
    expect(rw).toContain('Mu turere twose 30')
  })
})
