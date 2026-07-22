import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { WHOLESALE_CONFIG } from '@/lib/wholesale-config'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const page = read('src/components/wholesale/WholesaleView.tsx')
const publicWholesaleSurfaces = [
  page,
  read('src/components/layout/Navbar.tsx'),
  read('src/app/page.tsx'),
  read('src/components/products/ProductDetailClient.tsx'),
  read('src/app/account/page.tsx'),
].join('\n')
const applyApi = read('src/app/api/wholesale/apply/route.ts')
const english = read('src/lib/i18n/translations/en.ts')
const kinyarwanda = read('src/lib/i18n/translations/rw.ts')

const removedPageClaims = [
  "t('wholesale.discount_title')",
  "t('wholesale.credit_desc')",
  "t('wholesale.pricing_example')",
  "t('wholesale.faq_min_a')",
  "t('wholesale.expected_48')",
  "t('wholesale.review_24_48')",
  "t('wholesale.approved_credit')",
  "t('wholesale.approved_discount')",
  'https://wa.me/250780000000',
]

describe('honest wholesale page', () => {
  it('does not render unsupported discount, minimum, credit, timing, or contact claims', () => {
    for (const claim of removedPageClaims) expect(page).not.toContain(claim)
    expect(publicWholesaleSurfaces).not.toMatch(/50,000|24-48|30-day|save up to 30%/i)
    expect(english).not.toContain("wholesale_offer: 'Wholesale beauty — save up to 30%'")
    expect(kinyarwanda).not.toContain("wholesale_offer: 'Kurangura ibicuruzwa by’ubwiza — zigama kugera kuri 30%'")
  })

  it('renders the fail-closed terms through translations', () => {
    for (const key of [
      'honest_pricing_desc',
      'honest_minimum_unconfigured',
      'honest_credit_disabled',
      'honest_review_no_promise',
      'honest_documents_initial',
    ]) {
      expect(page).toContain(`wholesale.${key}`)
      expect(english).toContain(`${key}:`)
      expect(kinyarwanda).toMatch(new RegExp(`${key}:.*// verified-rw`))
    }
  })

  it('uses only the owner-confirmed WhatsApp contacts without inventing hours', () => {
    expect(WHOLESALE_CONFIG.contacts).toEqual([
      { name: 'FreedomCosmeticShop', whatsappE164: '250790215965', displayPhone: '0790 215 965' },
      { name: 'FreedomCosmeticShop', whatsappE164: '250785361796', displayPhone: '0785 361 796' },
    ])
    expect(page).toContain('WHOLESALE_CONFIG.contacts.map')
    expect(page).toContain("t('wholesale.honest_no_hours_promise')")
  })

  it('collects owner contact details but not identity-document data in the initial form', () => {
    for (const field of ['ownerName', 'ownerPhone', 'ownerEmail']) {
      expect(page).toContain(field)
      expect(applyApi).toContain(field)
    }
    expect(page).not.toContain('setNationalId')
    expect(page).not.toContain('id="national-id"')
    expect(applyApi).toContain('documents: "[]"')
    expect(applyApi).not.toContain('z.array(z.string())')
  })
})
