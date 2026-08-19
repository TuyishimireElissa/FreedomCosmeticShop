import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildProductShareText, buildWhatsAppShareUrl } from '@/lib/whatsapp/product-share'

const read = (path: string) => readFileSync(path, 'utf8')
const detail = read('src/components/products/ProductDetailClient.tsx')
const tabs = read('src/components/products/ProductTabs.tsx')
const card = read('src/components/storefront/ProductCard.tsx')
const quickView = read('src/components/products/QuickView.tsx')
const en = read('src/lib/i18n/translations/en.ts')
const rw = read('src/lib/i18n/translations/rw.ts')

describe('WhatsApp share text (pure)', () => {
  const product = { name: 'Vitamin C Serum', slug: 'vitamin-c-serum', price: 8500 }

  it('uses the owner-authored whatsappShareText verbatim when present', () => {
    const text = buildProductShareText({ ...product, whatsappShareText: 'Promo! Gura uyu munsi.' }, false, 'https://freedomcosmeticshop.com')
    expect(text).toBe('Promo! Gura uyu munsi.')
  })

  it('falls back to a bilingual template with price and product URL', () => {
    const enText = buildProductShareText(product, false, 'https://freedomcosmeticshop.com/')
    expect(enText).toContain('View Vitamin C Serum at FreedomCosmeticShop')
    expect(enText).toContain('RWF 8,500')
    expect(enText).toContain('https://freedomcosmeticshop.com/products/vitamin-c-serum')
    const rwText = buildProductShareText(product, true, 'https://freedomcosmeticshop.com/')
    expect(rwText).toContain('Reba Vitamin C Serum kuri FreedomCosmeticShop')
  })

  it('builds an encoded wa.me share URL', () => {
    const url = buildWhatsAppShareUrl('Hello, world!\nhttps://x.test/a b')
    expect(url.startsWith('https://wa.me/?text=')).toBe(true)
    expect(url).toContain(encodeURIComponent('Hello, world!'))
    expect(url).not.toContain(' ')
  })
})

describe('product detail page — 23-field display (Phase 5)', () => {
  it('shows the bilingual name with EN fallback', () => {
    expect(detail).toContain('isRW && hasText(product.nameRw)')
    expect(detail).toContain('{displayName}</h1>')
  })

  it('shows brand and bilingual category together', () => {
    expect(detail).toContain("categoryLabel(")
    expect(detail).toContain('product.category.nameRw')
  })

  it('shows the RW short description with fallback', () => {
    expect(detail).toContain('isRW && hasText(product.shortDescriptionRw)')
  })

  it('renders unique selling points only when present, with a heading', () => {
    expect(detail).toContain('product.uniqueSellingPoints.length > 0')
    expect(detail).toContain("t('product.why_love')")
  })

  it('renders the Suitable For badge section that merges legacy channels', () => {
    expect(detail).toContain('SuitableForSection')
    expect(detail).toContain('product.suitableFor?.skinType')
    expect(detail).toContain('product.skinType ?? []')
    expect(detail).toContain('product.hairType ? [product.hairType] : []')
    expect(detail).toContain("t('product.suitable_for')")
    expect(detail).toContain('return null') // section self-hides when empty
  })

  it('renders Expected Results with RW fallback and timeframe', () => {
    expect(detail).toContain('isRW && hasText(product.expectedResultsRw)')
    expect(detail).toContain("t('product.expected_results')")
    expect(detail).toContain('product.resultsTimeframe')
  })

  it('renders the Share on WhatsApp button from the shared builder', () => {
    expect(detail).toContain('buildProductShareText(')
    expect(detail).toContain('buildWhatsAppShareUrl(')
    expect(detail).toContain("t('product.share_whatsapp')")
    expect(detail).toContain('bg-fcs-whatsapp-pill')
    expect(detail).toContain('motion-reduce:transition-none')
  })

  it('never uses raw hex in the new sections', () => {
    // The new Phase 5 blocks must use fcs-* tokens only.
    expect(detail).not.toContain('#25D366')
    expect(detail).not.toContain('#1E874A')
  })
})

describe('product tabs (Phase 5)', () => {
  it('shows the RW full description with EN fallback', () => {
    expect(tabs).toContain('isRW && hasText(product.descriptionRw)')
    expect(tabs).toContain(': product.description')
  })
})

describe('product card + quick view bilingual names', () => {
  it('shows nameRw on the card with EN fallback', () => {
    expect(card).toContain('isRW && product.nameRw?.trim()')
    expect(card).toContain('{displayName}</h2>')
    expect(card).toContain('product: displayName')
  })

  it('shows nameRw and shortDescriptionRw in the quick view', () => {
    expect(quickView).toContain('isRW && product.nameRw?.trim()')
    expect(quickView).toContain('isRW && product.shortDescriptionRw?.trim()')
  })
})

describe('phase 5 i18n keys', () => {
  it('defines suitable_for and why_love in both languages', () => {
    expect(en).toContain("suitable_for: 'Suitable for'")
    expect(en).toContain("why_love: \"Why you'll love it\"")
    expect(rw).toContain("suitable_for: 'Abakwiriwe'")
    expect(rw).toContain("why_love: 'Impamvu uzabikunda'")
  })
})
