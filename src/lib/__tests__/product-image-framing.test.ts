import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const card = readFileSync('src/components/storefront/ProductCard.tsx', 'utf8')
const cart = readFileSync('src/components/storefront/CartDrawer.tsx', 'utf8')
const publicProduct = readFileSync('src/lib/public-product.ts', 'utf8')
const gallery = readFileSync('src/components/products/ProductImageGallery.tsx', 'utf8')

describe('product image framing', () => {
  it('renders a large studio-style image card with an intentional fallback', () => {
    expect(card).toContain('aspect-[4/5]')
    expect(card).toContain('object-contain p-4')
    expect(card).toContain('<SmartImage')
    expect(card).toContain('context="card"')
    expect(card).toContain('<ImageIcon className="mx-auto h-12 w-12 text-gray-300"')
  })

  it('resolves API and legacy image fields with the same scalar used by cart', () => {
    for (const field of ['product.images', 'product.image', 'product.imageUrl', 'product.productImages', 'product.thumbnailUrl']) expect(card).toContain(field)
    expect(card.indexOf('product.productImages')).toBeLessThan(card.indexOf('product.images'))
    expect(card).toContain('<SmartImage')
    expect(card).toContain('fallbackSrc={imageUrl}')
    expect(card).toContain('publicId={imagePublicId}')
    expect(cart).toContain('src={item.image}')
    expect(publicProduct).toContain('images: true')
    expect(publicProduct).toContain('productImages: {')
  })

  it('keeps the detail gallery uncropped with a restrained zoom', () => {
    expect(gallery).toContain('object-contain p-4')
    expect(gallery).toContain("isZoomed ? 'scale-150' : 'scale-100'")
  })
})
