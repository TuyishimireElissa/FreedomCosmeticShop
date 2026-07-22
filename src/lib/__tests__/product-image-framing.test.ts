import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const card = readFileSync('src/components/storefront/ProductCard.tsx', 'utf8')
const cart = readFileSync('src/components/storefront/CartDrawer.tsx', 'utf8')
const publicProduct = readFileSync('src/lib/public-product.ts', 'utf8')
const gallery = readFileSync('src/components/products/ProductImageGallery.tsx', 'utf8')

describe('product image framing', () => {
  it('renders a square image-led card with a visible fallback', () => {
    expect(card).toContain('aspect-square')
    expect(card).toContain('object-contain p-4')
    expect(card).toContain('onError={() => setImageFailed(true)}')
    expect(card).toContain('<Package className="mb-2 h-16 w-16"')
  })

  it('resolves API and legacy image fields with the same scalar used by cart', () => {
    for (const field of ['product.images', 'product.image', 'product.imageUrl', 'product.productImages', 'product.thumbnailUrl']) expect(card).toContain(field)
    expect(card).toContain('<img')
    expect(card).toContain('src={imageUrl}')
    expect(cart).toContain('src={item.image}')
    expect(publicProduct).toContain('images: true')
    expect(publicProduct).toContain('productImages: {')
  })

  it('keeps the detail gallery uncropped with a restrained zoom', () => {
    expect(gallery).toContain('object-contain p-4')
    expect(gallery).toContain("isZoomed ? 'scale-150' : 'scale-100'")
  })
})
