import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

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
    for (const value of ['#B76E79', '#9B5A64', '#1a1a1a', '#C4956A', '#FAFAFA', '#EEEEEE', '#777777', '#AAAAAA', '#2D8A4E', '#D64045', '#E8A838']) expect(css).toContain(value)
    expect(css).toContain("font-family: 'Inter', system-ui, sans-serif")
  })

  it('removes the payment strip and decorative category emoji from navigation', () => {
    expect(navbar).not.toContain("t('checkout.mtn_momo')")
    expect(navbar).not.toContain("t('checkout.airtel_money')")
    expect(navbar).not.toContain('category.icon')
    expect(navbar).toContain('<Store className="h-4 w-4"')
  })

  it('uses one shared image-led card with a clean responsive grid', () => {
    expect(productGrid).toContain("import { ProductCard } from '@/components/storefront/ProductCard'")
    expect(productGrid).toContain('grid-cols-2')
    expect(productGrid).toContain('md:grid-cols-3')
    expect(productGrid).toContain('lg:grid-cols-4')
    expect(productCard).toContain('aspect-square')
    expect(productCard).toContain('<Package className="h-12 w-12 text-gray-300"')
    expect(productCard).not.toContain("t('product.no_reviews')")
  })

  it('moves payment information to the footer as plain text', () => {
    for (const method of ['MTN MoMo', 'Airtel Money', 'Visa', 'Mastercard', 'Cash on Delivery']) expect(footer).toContain(method)
  })

  it('contains no emoji in rendered app or component TSX source', () => {
    const paths = [...tsxFiles('src/app'), ...tsxFiles('src/components')]
    expect(paths.length).toBeGreaterThan(100)
    for (const path of paths) expect(read(path), path).not.toMatch(emoji)
  })
})
