/**
 * Phase 5 Commit 1 — homepage conversion and correctness.
 *
 * These guard four things that are easy to regress and expensive to get wrong:
 *   1. the hero offers the only working order path above the fold
 *   2. the trust bar never advertises a payment method the shop cannot accept
 *   3. an uncurated "Featured" rail hides instead of claiming an empty shop
 *   4. the Kinyarwanda says what it is supposed to say
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')

const hero = read('src/components/home/Hero.tsx')
const trust = read('src/components/home/TrustSection.tsx')
const how = read('src/components/home/HowToOrder.tsx')
const reviews = read('src/components/home/ReviewsSection.tsx')
const featured = read('src/components/home/FeaturedProducts.tsx')
const home = read('src/app/page.tsx')
const en = read('src/lib/i18n/translations/en.ts')
const rw = read('src/lib/i18n/translations/rw.ts')

const enValue = (key: string) => en.match(new RegExp(`\\n\\s*${key}: ['"](.*?)['"],`))?.[1] ?? ''
const rwValue = (key: string) => rw.match(new RegExp(`\\n\\s*${key}: ['"](.*?)['"],`))?.[1] ?? ''

describe('hero offers the working order path', () => {
  it('sends the secondary CTA to WhatsApp, not the wholesale form', () => {
    // It previously pointed at /wholesale, which put a wholesale application
    // in front of every first-time retail buyer.
    expect(hero).toContain('whatsappHref')
    expect(hero).not.toContain('href="/wholesale"')
    expect(enValue('hero_cta_secondary')).toBe('Order on WhatsApp')
    expect(rwValue('hero_cta_secondary')).toBe('Gura kuri WhatsApp')
  })

  it('keeps browsing available as the other CTA', () => {
    expect(hero).toContain('href="/products"')
    expect(enValue('hero_cta_primary')).toBe('Shop Now')
  })

  it('builds the link through the config helper so a placeholder never ships', () => {
    expect(hero).toContain('getWhatsAppLink')
    expect(hero).toContain('isPlaceholder(BUSINESS.whatsapp)')
    // A hard-coded wa.me URL would bypass the placeholder guard entirely.
    expect(hero).not.toMatch(/https:\/\/wa\.me\//)
  })

  it('opens WhatsApp safely in a new tab', () => {
    expect(hero).toContain('rel="noopener noreferrer"')
  })
})

describe('trust bar tells the truth about payment and delivery', () => {
  it('never advertises cards while online payments are disabled', () => {
    // payments.enabled is false. Listing Visa/Mastercard promises a checkout
    // path that does not exist.
    for (const banned of ['Visa', 'Mastercard']) {
      expect(enValue('trust_payment_providers')).not.toContain(banned)
      expect(rwValue('trust_payment_providers')).not.toContain(banned)
    }
  })

  it('lists exactly the methods that work today', () => {
    const value = enValue('trust_payment_providers')
    expect(value).toContain('MTN MoMo')
    expect(value).toContain('Airtel Money')
    expect(value.toLowerCase()).toContain('cash')
  })

  it('states nationwide delivery', () => {
    expect(enValue('trust_kigali_delivery')).toContain('30 districts')
    expect(rwValue('trust_kigali_delivery')).toContain('turere twose 30')
  })

  it('shows the sector once, not "Nyarugenge, Nyarugenge"', () => {
    // Nyarugenge is both the sector and the district that contains it.
    expect(enValue('trust_location_detail')).toBe('{sector}, Kigali')
    expect(trust).toContain('sector: BUSINESS.address.sector')
    expect(trust).not.toContain('district: BUSINESS.address.district }')
  })
})

describe('how to order', () => {
  it('is rendered between trust and the catalogue', () => {
    expect(home).toContain('<HowToOrder />')
    expect(home.indexOf('<HowToOrder />')).toBeGreaterThan(home.indexOf('<TrustSection />'))
    // MainCategories was replaced by CategoryGrid in the Warm Brutalism
    // phase; the ordering constraint is unchanged.
    expect(home.indexOf('<HowToOrder />')).toBeLessThan(home.indexOf('<CategoryGrid'))
  })

  it('uses an ordered list so the sequence survives without CSS', () => {
    expect(how).toContain('<ol')
    expect(how).toContain('aria-labelledby')
  })

  it('names only payment methods that work', () => {
    expect(enValue('how_step3_body')).toContain('MTN MoMo')
    expect(enValue('how_step3_body')).toContain('cash')
    for (const banned of ['Visa', 'Mastercard', 'card']) {
      expect(enValue('how_step3_body')).not.toContain(banned)
    }
  })

  it('is static — nothing to fail or wait on over 3G', () => {
    expect(how).not.toContain('fetch(')
    expect(how).not.toContain('useEffect')
  })
})

describe('reviews empty state', () => {
  it('invites the first review instead of rendering nothing', () => {
    expect(reviews).toContain('reviews_empty_title')
    expect(reviews).toContain('reviews_empty_cta')
    expect(reviews).toContain('whatsappHref')
  })

  it('still waits for the fetch before deciding', () => {
    // Rendering the invitation during load would flash it and then replace it.
    expect(reviews).toContain('if (loading || !stats) return null')
  })

  it('invents no social proof', () => {
    for (const claim of ['customers love', '5 stars', 'thousands', 'best seller']) {
      expect(reviews.toLowerCase()).not.toContain(claim)
    }
  })
})

describe('featured rail with no curated products', () => {
  it('hides rather than claiming the shop is empty', () => {
    // 101 products are active. "No products available yet" would be false.
    expect(featured).toContain("products.length === 0 && type === 'featured'")
    expect(featured).toContain('return null')
  })

  it('still shows the empty-catalogue message for the new-arrivals rail', () => {
    // That rail reads the whole catalogue, so zero really does mean empty.
    expect(featured).toContain('home_no_products')
  })
})

describe('quiz banner is not rendered while the quiz is broken', () => {
  it('is absent from the homepage but left intact in the codebase', () => {
    expect(home).not.toMatch(/^\s*<QuizBanner \/>/m)
    expect(home).toContain('QuizBanner intentionally not rendered')
  })
})

describe('Kinyarwanda is correct, not literal', () => {
  it('uses igitebo for cart, never igare', () => {
    // `igare` means bicycle. The repo uses `igitebo` throughout.
    for (const key of ['how_step1_title', 'how_step1_body', 'how_step2_title', 'how_step2_body']) {
      expect(rwValue(key), key).not.toMatch(/\bigare\b/i)
    }
    expect(rwValue('how_step1_title')).toContain('gitebo')
  })

  it('uses amafaranga afatika for cash, never ikoranabuhanga', () => {
    // `ikoranabuhanga` means technology — "electronic money" is the opposite
    // of cash and would contradict the English on the same card.
    expect(rwValue('how_step3_body')).not.toContain('ikoranabuhanga')
    expect(rwValue('trust_payment_providers')).not.toContain('ikoranabuhanga')
    expect(rwValue('how_step3_body')).toContain('amafaranga afatika')
  })

  it('marks every new Kinyarwanda string as reviewed', () => {
    const keys = [
      'how_title', 'how_subtitle', 'how_step1_title', 'how_step1_body',
      'how_step2_title', 'how_step2_body', 'how_step3_title', 'how_step3_body',
      'reviews_empty_title', 'reviews_empty_body', 'reviews_empty_cta',
    ]
    for (const key of keys) {
      const line = rw.split('\n').find((row) => row.trim().startsWith(`${key}:`))
      expect(line, `${key} missing from rw.ts`).toBeTruthy()
      expect(line, `${key} not marked verified-rw`).toContain('verified-rw')
    }
  })

  it('defines every new key in both languages', () => {
    const keys = [
      'how_title', 'how_subtitle', 'how_step1_title', 'how_step1_body',
      'how_step2_title', 'how_step2_body', 'how_step3_title', 'how_step3_body',
      'reviews_empty_title', 'reviews_empty_body', 'reviews_empty_cta',
    ]
    for (const key of keys) {
      expect(enValue(key), `en ${key}`).not.toBe('')
      expect(rwValue(key), `rw ${key}`).not.toBe('')
    }
  })
})

describe('design system and accessibility', () => {
  it('new markup uses fcs tokens and the banned rose never appears', () => {
    for (const source of [how]) {
      expect(source).toContain('fcs-')
      expect(source).not.toContain('#C77B85')
      expect(source).not.toMatch(/\bum-[a-z]/)
    }
  })

  it('keeps interactive tap targets at 44px and respects reduced motion', () => {
    // HowToOrder is deliberately non-interactive, so it has no tap targets to
    // size — only the two components with links are checked here.
    expect(hero).toContain('min-h-12')
    expect(hero).toContain('motion-reduce:')
    expect(reviews).toContain('min-h-12')
    expect(reviews).toContain('motion-reduce:transition-none')
    expect(how).not.toContain('<button')
    expect(how).not.toContain('<a ')
  })
})
