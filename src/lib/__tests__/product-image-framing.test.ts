import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const card = readFileSync('src/components/storefront/ProductCard.tsx', 'utf8')
const gallery = readFileSync('src/components/products/ProductImageGallery.tsx', 'utf8')

describe('product image framing', () => {
  it('renders a square image-led card with a visible fallback', () => {
    expect(card).toContain('aspect-square')
    expect(card).toContain('object-cover')
    expect(card).toContain('onError={() => setImageFailed(true)}')
    expect(card).toContain('<Package className="h-12 w-12 text-gray-300"')
  })

  it('keeps the detail gallery uncropped with a restrained zoom', () => {
    expect(gallery).toContain('object-contain p-4')
    expect(gallery).toContain("isZoomed ? 'scale-150' : 'scale-100'")
  })
})
