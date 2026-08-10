/**
 * Warm Brutalism — Phase 2 homepage.
 *
 * The three components here all had to be designed against real data rather
 * than the brief's assumptions:
 *
 *   bento          the brief assumed 3 featured products; the live count is 0
 *   category grid  the brief assumed 4 image tiles; only 3 of 6 categories
 *                  have an image, and the two largest are among those without
 *   social proof   every claim must trace to something the system can back
 *
 * These tests pin the behaviour at the awkward counts, not the happy ones.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')

const proof = read('src/components/home/SocialProofBar.tsx')
const grid = read('src/components/home/CategoryGrid.tsx')
const bento = read('src/components/home/FeaturedBento.tsx')
const hero = read('src/components/home/Hero.tsx')
const page = read('src/app/page.tsx')
const en = read('src/lib/i18n/translations/en.ts')
const rw = read('src/lib/i18n/translations/rw.ts')

const value = (source: string, key: string) =>
  source.match(new RegExp(`\\n\\s*${key}: ['"](.*?)['"],`))?.[1] ?? ''

describe('social proof bar', () => {
  it('is mounted between search and trust', () => {
    expect(page).toContain('<SocialProofBar />')
    expect(page.indexOf('<SocialProofBar />')).toBeGreaterThan(page.indexOf('<HomeSearch />'))
    expect(page.indexOf('<SocialProofBar />')).toBeLessThan(page.indexOf('<TrustSection />'))
  })

  it('claims only what the system can back', () => {
    expect(value(en, 'proof_districts')).toContain('30 districts')
    expect(value(en, 'proof_payment')).toMatch(/MoMo/)
    expect(value(en, 'proof_payment')).toMatch(/cash/i)
    // No card claim — payments.enabled is false.
    for (const banned of ['Visa', 'Mastercard']) {
      expect(value(en, 'proof_payment')).not.toContain(banned)
    }
  })

  it('invents no customer or review numbers', () => {
    // Six orders, zero reviews in the database. Any count would be fabricated.
    // Strip comments first — the source legitimately explains this in prose.
    const code = proof.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').toLowerCase()
    for (const claim of ['customers', 'happy', 'rated', '1,000', '10,000', 'trusted by']) {
      expect(code, claim).not.toContain(claim)
    }
    // And the visible strings themselves carry no figure beyond the districts.
    expect(value(en, 'proof_authentic')).not.toMatch(/\d/)
    expect(value(en, 'proof_payment')).not.toMatch(/\d/)
  })

  it('scrolls rather than wrapping at 360px', () => {
    expect(proof).toContain('overflow-x-auto')
    expect(proof).toContain('whitespace-nowrap')
  })

  it('is a labelled list, not a row of divs', () => {
    expect(proof).toContain('<ul')
    expect(proof).toContain('aria-label')
  })
})

describe('category grid', () => {
  it('replaced the 3-up carousel on the homepage', () => {
    expect(page).toContain('<CategoryGrid')
    expect(page).not.toContain('<MainCategories')
  })

  it('orders by product count so the deepest category leads', () => {
    // The old component hard-coded a priority list that stopped at three and
    // dropped Body Care — 45 products, the largest category in the catalogue.
    expect(grid).toContain('productCount(b) - productCount(a)')
    expect(grid).toContain('slice(0, 4)')
  })

  it('renders an image-less category as a warm tile, never a blank box', () => {
    // Body Care (45 products) and Fragrance (31) have no image in the
    // database. Without this branch they render as a dark empty rectangle.
    expect(grid).toContain('hasImage')
    // The tone must actually be *applied* to the tile, not merely declared —
    // asserting the constant exists would pass even if it were dead code.
    expect(grid).toMatch(/hasImage\s*\?\s*'bg-fcs-text'\s*:\s*TONES\[/)
    expect(grid).toContain('TONES[index % TONES.length]')
    // And shows something useful in place of the photo.
    expect(grid).toContain('category_count')
  })

  it('keeps text legible in both tile states', () => {
    // Photo tiles get a scrim under white text; token tiles use --fcs-text,
    // which passes AA on every surface in TONES.
    expect(grid).toContain('from-black/75')
    expect(grid).toContain('text-fcs-text')
  })

  it('hides instead of rendering a lopsided grid', () => {
    expect(grid).toContain('tiles.length < 2) return null')
  })

  it('uses no raw hex — the old component had nine', () => {
    expect(grid).not.toMatch(/#[0-9A-Fa-f]{6}/)
  })
})

describe('featured bento survives an empty curation', () => {
  it('hides at zero rather than claiming an empty shop', () => {
    // 101 products are active; "no products available" would be false.
    expect(bento).toContain('products.length === 0) return null')
    expect(bento).not.toContain('home_no_products')
  })

  it('only goes bento at three or more', () => {
    // One product stretched to hero size reads as a rendering bug.
    expect(bento).toContain('products.length >= 3')
    expect(bento).toContain("index === 0 ? 'col-span-2 md:row-span-2'")
  })

  it('reuses ProductCard instead of forking stock and cart behaviour', () => {
    expect(bento).toContain("from '@/components/storefront/ProductCard'")
    expect(bento).not.toContain('add_to_cart')
  })

  it('uses the shared skeleton while loading', () => {
    expect(bento).toContain('SkeletonGrid')
    expect(bento).toContain('featured_loading')
  })

  it('aborts its fetch on unmount', () => {
    expect(bento).toContain('AbortController')
    expect(bento).toContain('controller.abort()')
  })
})

describe('hero', () => {
  it('sets the statement in the serif display face', () => {
    expect(hero).toContain('font-display text-4xl')
  })

  it('uses full-pill CTAs on the AA-safe WhatsApp fill', () => {
    expect(hero).toContain('rounded-full bg-fcs-brand-strong')
    // --fcs-whatsapp is 1.98:1 with white and must never back a white-text
    // button; --fcs-whatsapp-pill is 4.55:1.
    expect(hero).toContain('bg-fcs-whatsapp-pill')
    expect(hero).not.toContain('bg-fcs-whatsapp px-')
  })

  it('respects reduced motion on both CTAs', () => {
    expect(hero.match(/motion-reduce:transition-none/g)?.length).toBeGreaterThanOrEqual(2)
  })
})

describe('token discipline', () => {
  it('routes the three hard-coded hex bypasses through tokens', () => {
    // Found during Phase 1 live verification: fixing the tokens did nothing
    // for components that never read them.
    expect(read('src/components/ui/button.tsx')).toContain('bg-fcs-error')
    expect(read('src/components/ui/toast.tsx')).toContain('bg-fcs-error')
    expect(read('src/components/checkout/ConfirmationView.tsx')).toContain('bg-fcs-success')
    for (const file of ['src/components/ui/button.tsx', 'src/components/ui/toast.tsx', 'src/components/checkout/ConfirmationView.tsx']) {
      expect(read(file), file).not.toContain('#D64045')
      expect(read(file), file).not.toContain('#2D8A4E')
    }
  })

  it('keeps new homepage components on fcs tokens', () => {
    for (const [name, source] of [['proof', proof], ['grid', grid], ['bento', bento]] as const) {
      expect(source, name).toContain('fcs-')
      expect(source, name).not.toContain('#C77B85')
      expect(source, name).not.toMatch(/\bum-[a-z]/)
    }
  })
})

describe('translations', () => {
  const keys = [
    'proof_label', 'proof_districts', 'proof_payment', 'proof_authentic',
    'category_count', 'featured_eyebrow', 'featured_loading',
  ]

  it('defines every new key in both languages', () => {
    for (const key of keys) {
      expect(value(en, key), `en ${key}`).not.toBe('')
      expect(value(rw, key), `rw ${key}`).not.toBe('')
    }
  })

  it('marks the Kinyarwanda as reviewed', () => {
    for (const key of keys) {
      const line = rw.split('\n').find((row) => row.trim().startsWith(`${key}:`))
      expect(line, `${key} missing`).toBeTruthy()
      expect(line, `${key} unmarked`).toContain('verified-rw')
    }
  })

  it('says amafaranga afatika for cash, never ikoranabuhanga', () => {
    // `ikoranabuhanga` means technology — electronic money, the opposite.
    expect(value(rw, 'proof_payment')).toContain('afatika')
    expect(value(rw, 'proof_payment')).not.toContain('ikoranabuhanga')
  })
})
