import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')
const quickView = read('src/components/products/QuickView.tsx')
const card = read('src/components/storefront/ProductCard.tsx')
const grid = read('src/components/products/ProductGrid.tsx')
const featured = read('src/components/home/FeaturedProducts.tsx')
const detail = read('src/components/products/ProductDetailClient.tsx')

describe('complete accessible product Quick View', () => {
  it('provides desktop and mobile triggers from the one shared card', () => {
    expect(card).toContain("dynamic(() => import('@/components/products/QuickView')")
    // The label was the hardcoded English "Quick View: ${product.name}" on a
    // bilingual site. It is now translated, so this asserts the accessible
    // name is still per-product and still present on BOTH triggers, without
    // pinning it to one language.
    const labels = card.match(/aria-label=\{`\$\{t\('search\.quick_view'\)\}: \$\{product\.name\}`\}/g) || []
    expect(labels.length, 'both Quick View triggers need a per-product label').toBe(2)
    expect(card).toContain('group-hover:opacity-100')
    expect(card).toContain('md:hidden')
    expect(card).toContain('<Eye')
    expect(card).toContain('<QuickView product={product}')
  })

  it('implements an accessible modal, focus trap, keyboard controls, and every close method', () => {
    for (const value of [
      'role="dialog"', 'aria-modal="true"', "event.key === 'Escape'", "event.key === 'ArrowRight'", "event.key === 'ArrowLeft'",
      "event.key !== 'Tab'", "document.body.style.overflow = 'hidden'", "event.target === event.currentTarget", 'deltaY > 90',
      "window.history.pushState", "window.addEventListener('popstate'", 'Close Quick View', 'backdrop-blur-sm', 'scale-95',
    ]) expect(quickView).toContain(value)
  })

  it('supports a responsive gallery with zoom, swipe, arrows, and dots', () => {
    for (const value of [
      'getProductImageGallery', 'activeIndex', 'nextImage', 'previousImage', 'Zoom in product image', 'duration-300',
      'Previous product image', 'Next product image', 'Show image ${index + 1}', 'bg-gradient-to-b from-gray-50 to-white', '<ImageIcon',
    ]) expect(quickView).toContain(value)
  })

  it('shows truthful product information, live totals, wholesale pricing, and real delivery data', () => {
    for (const value of [
      'product.brand?.name', 'product.reviewsCount > 0', 'comparePrice', 'You save', 'product.skinType?.slice',
      "product.shortDescription", 'displayPrice * quantity', "t('product.add_to_cart')", 'Added!', 'Wholesale',
      'product.stock <= 5', '/api/delivery/calculate?district=Gasabo&orderTotal=', 'delivery.deliveryTime',
    ]) expect(quickView).toContain(value)
    expect(quickView).not.toContain('Same day delivery')
    expect(quickView).not.toContain('fake')
  })

  it('supports cart, details, wishlist, and WhatsApp sharing on every shared-card surface', () => {
    for (const value of [
      'addToCart({', "fetch('/api/wishlist'", 'buildWhatsAppShareUrl', 'View Full Details', "trackWhatsAppClick('share_product'",
    ]) expect(quickView).toContain(value)
    expect(grid).toContain('<ProductCard')
    expect(featured).toContain('<ProductCard')
    // Related products moved from ProductGrid to RoutineRail (horizontal rail
    // on phones). Both render the shared ProductCard, which is the guarantee
    // this test exists to protect — assert that rather than the container.
    expect(detail).toContain('<RoutineRail products={')
    expect(detail).toContain('similar.length > 0 ? similar : (related || [])')
    expect(read('src/components/products/RoutineRail.tsx')).toContain("from '@/components/storefront/ProductCard'")
  })
})
