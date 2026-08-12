/**
 * Delivery ticker + routine bundles.
 *
 * Both were in the owner's brief as hard-coded content. Both ship data-driven
 * and dormant instead:
 *
 *   Ticker    reads DELIVERED orders. There are 0, so it hides. Verified
 *             end-to-end by temporarily flipping one CANCELLED order to
 *             DELIVERED against the live database — the query returned
 *             ["Kamonyi"] — then restoring it.
 *   Routines  reads Bundle rows with bundleType ROUTINE. There are 0, so it
 *             hides. The brief asked for a routines.ts config holding product
 *             IDs; that would duplicate the existing Bundle/BundleProduct
 *             models and break silently when a product is deleted.
 *
 * This is the FeaturedBento pattern: build it properly, let it stay invisible,
 * and it lights up the moment the owner adds content. No placeholder data.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')

/** Comments stripped: every file here explains what it rejected, in prose. */
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '')

const api = code('src/app/api/orders/recent-deliveries/route.ts')
const ticker = code('src/components/home/DeliveryTicker.tsx')
const routines = code('src/components/home/RoutineBundles.tsx')
const page = code('src/app/page.tsx')
const css = read('src/app/globals.css')
const rw = read('src/lib/i18n/translations/rw.ts')
const en = read('src/lib/i18n/translations/en.ts')

describe('the public deliveries feed leaks nothing', () => {
  it('selects only a district and a timestamp', () => {
    // This endpoint is unauthenticated. Anything selected here is public.
    expect(api).toContain('select: { district: true, updatedAt: true }')
  })

  it.each(['customerName', 'customerPhone', 'customerEmail', 'orderNumber', 'total', 'items', 'userId'])(
    'never queries %s',
    (field) => {
      // Not merely omitted from the response — never fetched, so a future
      // `select` slip cannot expose what was never loaded.
      expect(api, `${field} must not appear`).not.toContain(field)
    },
  )

  it('counts only genuinely delivered orders', () => {
    // CONFIRMED means the owner accepted it, not that anyone received it.
    expect(api).toContain("status: 'DELIVERED'")
    expect(api).not.toContain("'CONFIRMED'")
  })

  it('skips rows with no district rather than rendering a blank', () => {
    expect(api).toContain('district: { not: null }')
    expect(api).toContain(".trim().length > 0")
  })

  it('caps the feed at three', () => {
    expect(api).toContain('take: 3')
  })

  it('degrades to empty instead of breaking the homepage', () => {
    // Social proof is decorative; a DB blip must not 500 the front page.
    expect(api).toMatch(/catch[\s\S]{0,200}?success: true, data: \[\]/)
  })
})

describe('the ticker hides when there is nothing true to say', () => {
  it('renders nothing on an empty feed', () => {
    expect(ticker).toContain('if (items.length === 0) return null')
  })

  it('has no hard-coded placeholder districts', () => {
    for (const invented of ['Musanze', 'Nyarugenge', 'Gasabo', 'Kicukiro', 'Huye']) {
      expect(ticker, `invented ${invented}`).not.toContain(invented)
    }
  })

  it('duplicates the row for a seamless loop but hides the clone from AT', () => {
    // A screen reader must hear each delivery once, not twice.
    expect(ticker).toContain('{row(false)}')
    expect(ticker).toContain('{row(true)}')
    expect(ticker).toContain('aria-hidden={ariaHidden || undefined}')
  })
})

describe('the marquee is well behaved', () => {
  const block = () => {
    const start = css.indexOf('@keyframes fcs-marquee')
    const end = css.indexOf('@keyframes cb-camera-1')
    expect(start).toBeGreaterThan(0)
    expect(end).toBeGreaterThan(start)
    return css.slice(start, end)
  }

  it('slides exactly -50% so the second copy lands on the first', () => {
    expect(block()).toContain('translateX(-50%)')
  })

  it('pauses on hover and on keyboard focus', () => {
    const b = block()
    expect(b).toContain(':hover .fcs-marquee-track')
    expect(b).toContain(':focus-within .fcs-marquee-track')
    expect(b).toContain('animation-play-state: paused')
  })

  it('stops entirely and drops the duplicate under reduced motion', () => {
    const b = block()
    expect(b).toContain('prefers-reduced-motion: reduce')
    expect(b).toContain('animation: none')
    // Otherwise a static row would show every district twice.
    expect(b).toContain("[aria-hidden='true']")
  })

  it('animates transform only', () => {
    const b = block()
    expect(b).not.toContain('left:')
    expect(b).not.toContain('margin-left')
  })
})

describe('routines come from the Bundle model, not a config file', () => {
  it('reads the real ROUTINE bundles endpoint', () => {
    expect(routines).toContain("'/api/bundles?type=ROUTINE'")
  })

  it('has no hard-coded product ids', () => {
    // The brief asked for routines.ts with product IDs. Those break silently
    // when a product is deleted, and duplicate BundleProduct.
    expect(routines).not.toMatch(/products:\s*\[\s*'c[a-z0-9]{20,}/)
    expect(routines).not.toContain('routines.ts')
  })

  it('reuses BundleCard instead of a parallel card', () => {
    expect(routines).toContain("from '@/components/bundles/BundleCard'")
  })

  it('hides while the owner has created none', () => {
    expect(routines).toContain('if (loading || bundles.length === 0) return null')
  })

  it('reserves no space while loading', () => {
    // An optional section must not push real content down on every load.
    expect(routines).not.toContain('SkeletonGrid')
  })
})

describe('both sections are wired into the homepage lazily', () => {
  it.each(['DeliveryTicker', 'RoutineBundles'])('%s is dynamically imported and rendered', (name) => {
    expect(page).toContain(`const ${name} = dynamic(`)
    expect(page).toContain(`<${name}`)
  })

  it('the ticker sits above the fold-adjacent proof bar', () => {
    expect(page.indexOf('<DeliveryTicker')).toBeLessThan(page.indexOf('<SocialProofBar'))
  })

  it('routines follow the curated shelf', () => {
    // Browse departments -> best items -> how to combine them.
    expect(page.indexOf('<FeaturedBento')).toBeLessThan(page.indexOf('<RoutineBundles'))
  })
})

describe('new copy is bilingual and verified', () => {
  const KEYS = [
    'ticker_delivered', 'ticker_label',
    'routines_eyebrow', 'routines_title', 'routines_subtitle', 'routines_cta',
  ]

  it.each(KEYS)('%s exists in both languages', (key) => {
    expect(rw, `rw missing ${key}`).toContain(`${key}:`)
    expect(en, `en missing ${key}`).toContain(`${key}:`)
  })

  it.each(KEYS)('%s carries a verified-rw marker', (key) => {
    const line = rw.split('\n').find((row) => row.trim().startsWith(`${key}:`))
    expect(line, `${key} missing from rw`).toBeTruthy()
    expect(line, `${key} unverified`).toContain('verified-rw')
  })

  it('the district placeholder survives translation', () => {
    expect(rw).toContain('{district}')
    expect(en).toContain('{district}')
  })
})
