import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const card = readFileSync('src/components/storefront/ProductCard.tsx', 'utf8')
const gallery = readFileSync('src/components/products/ProductImageGallery.tsx', 'utf8')

describe('product image framing', () => {
  it('shows complete product photos on compact and desktop cards', () => {
    expect(card.match(/aspect-\[4\/5\]/g)).toHaveLength(2)
    expect(card).toContain('object-contain p-2')
    expect(card).toContain('object-contain p-3')
    expect(card).not.toContain('object-cover')
  })

  it('keeps the detail gallery uncropped with a restrained zoom', () => {
    expect(gallery).toContain('object-contain p-4')
    expect(gallery).toContain("isZoomed ? 'scale-150' : 'scale-100'")
  })
})
