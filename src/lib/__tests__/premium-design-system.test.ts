import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ACCEPTED_PAYMENTS } from '@/lib/accepted-payments'

const read = (path: string) => readFileSync(path, 'utf8')
function tsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? tsxFiles(path) : path.endsWith('.tsx') ? [path] : []
  })
}
const css = read('src/app/globals.css')
const navbar = read('src/components/layout/Navbar.tsx')
const productGrid = read('src/components/products/ProductGrid.tsx')
const productCard = read('src/components/storefront/ProductCard.tsx')
const footer = read('src/components/layout/Footer.tsx')
const emoji = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}]/u

describe('premium cosmetics design system', () => {
  it('defines the approved palette and restrained surfaces', () => {
    // Warm Editorial token set. #FAFAFA/#EEEEEE/#777777/#AAAAAA were retired:
    // the cold greys became warm ivory (#FAF8F6/#EDE7E3) and the muted grey
    // moved to #6B7280, which passes AA at 4.83:1 where #9CA3AF failed at 2.54:1.
    for (const value of ['#B76E79', '#9B5A64', '#1a1a1a', '#C4956A', '#2D8A4E', '#D64045', '#E8A838']) expect(css).toContain(value)
    for (const value of ['--fcs-brand-text: #9B545F', '--fcs-text-muted: #6B7280', '--fcs-surface: #FAF8F6', '--fcs-whatsapp: #25D366']) expect(css).toContain(value)
    // Brand rose must never be the raw text colour: 3.80:1 fails AA.
    expect(css).toContain('--fcs-brand: #B76E79')
    expect(css).toContain("font-family: 'Inter', system-ui, sans-serif")
  })

  it('removes the payment strip and decorative category emoji from navigation', () => {
    expect(navbar).not.toContain("t('checkout.mtn_momo')")
    expect(navbar).not.toContain("t('checkout.airtel_money')")
    expect(navbar).not.toContain('category.icon')
    expect(navbar).not.toContain('<Sparkles')
    expect(navbar).not.toContain('<Gift')
    expect(navbar).not.toContain('<Store')
  })

  it('uses one shared image-led card with a clean responsive grid', () => {
    expect(productGrid).toContain("import { ProductCard } from '@/components/storefront/ProductCard'")
    expect(productGrid).toContain('grid-cols-2')
    expect(productGrid).toContain('md:grid-cols-3')
    expect(productGrid).toContain('lg:grid-cols-4')
    expect(productCard).toContain('aspect-[4/5]')
    expect(productCard).toContain('<ImageIcon className="mx-auto h-12 w-12 text-gray-300"')
    expect(productCard).not.toContain("t('product.no_reviews')")
  })

  it('shows payment information in the footer as plain text', () => {
    // The labels moved into src/lib/accepted-payments.ts so the footer, the
    // schema.org paymentAccepted property and the payment FAQ cannot drift
    // apart again. This test previously required 'Visa' and 'Mastercard' to be
    // present, which enforced a claim the shop cannot honour while
    // payments.enabled is false — payments-truth.test.ts now polices that.
    expect(footer).toContain('ACCEPTED_PAYMENTS')
    for (const method of ACCEPTED_PAYMENTS) expect(footer + JSON.stringify(ACCEPTED_PAYMENTS)).toContain(method)
  })

  it('contains no emoji in rendered app or component TSX source', () => {
    const paths = [...tsxFiles('src/app'), ...tsxFiles('src/components')]
    expect(paths.length).toBeGreaterThan(100)
    for (const path of paths) expect(read(path), path).not.toMatch(emoji)
  })
})
