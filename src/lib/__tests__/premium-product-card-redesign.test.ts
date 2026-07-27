import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')
const card = read('src/components/storefront/ProductCard.tsx')
const grid = read('src/components/products/ProductGrid.tsx')
const featured = read('src/components/home/FeaturedProducts.tsx')
const personalized = read('src/components/home/PersonalizedRecommendations.tsx')
const detail = read('src/components/products/ProductDetailClient.tsx')
const products = read('src/components/products/ProductsPageClient.tsx')

describe('premium shared product card redesign', () => {
  it('uses a large studio image with depth and restrained motion', () => {
    for (const value of [
      'aspect-[4/5]',
      'bg-gradient-to-b from-gray-50 to-white',
      'drop-shadow-[0_10px_14px_rgba(15,23,42,0.10)]',
      'group-hover:scale-105',
      'duration-500',
      'from-black/20 to-transparent',
    ]) expect(card).toContain(value)
  })

  it('has premium equal-height hierarchy without fabricated reviews', () => {
    for (const value of [
      'flex h-full min-w-0 flex-col',
      'rounded-2xl',
      'hover:-translate-y-1',
      'hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]',
      'line-clamp-2 min-h-10',
      'text-base font-extrabold',
      'product.reviewsCount > 0',
      '[1, 2, 3, 4, 5].map',
      'line-through',
    ]) expect(card).toContain(value)
    expect(card).not.toContain("t('product.no_reviews')")
  })

  it('uses one sale badge, accessible wishlist, and touch-friendly cart action', () => {
    expect(card).toContain('discount > 0')
    expect(card).toContain('bg-red-500')
    expect(card).not.toContain('BESTSELLER')
    expect(card).not.toContain("text: 'WHOLESALE'")
    expect(card).toContain('md:group-hover:opacity-100')
    expect(card).toContain('aria-pressed={activeWishlisted}')
    expect(card).toContain('min-h-11 w-full')
    expect(card).toContain("isWholesale ? 'bg-emerald-600")
  })

  it('uses responsive two, three, and four-column equal-height grids', () => {
    for (const source of [grid, featured, personalized]) {
      expect(source).toContain('grid-cols-2')
      expect(source).toContain('md:grid-cols-3')
      expect(source).toContain('lg:grid-cols-4')
    }
    expect(grid).toContain('items-stretch')
    expect(grid).toContain('gap-4')
    expect(grid).toContain('md:gap-6')
  })

  it('uses the shared card for catalogue, category/search, homepage, and related products', () => {
    expect(products).toContain('<ProductGrid products={products}')
    expect(detail).toContain('<ProductGrid products={related || []}')
    expect(featured).toContain('<ProductCard')
    expect(personalized).toContain('<ProductCard')
    expect(grid).toContain('<ProductCard')
  })
})
