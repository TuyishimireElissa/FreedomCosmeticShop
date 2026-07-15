import { describe, expect, it } from 'vitest'
import {
  getCloudinaryUrl,
  getProductImageGallery,
  getProductPrimaryImage,
  getResponsiveSrcSet,
} from '@/lib/cloudinary-images'

describe('Cloudinary product image helpers', () => {
  it('uses a 300px transform for mobile cards', () => {
    const url = getCloudinaryUrl('freedomcosmeticshop/products/example', 'CARD_MOBILE')
    expect(url).toContain('/w_300,h_300,')
    expect(url).toContain('q_auto')
    expect(url).toContain('f_auto')
  })

  it('rejects full URLs passed as public IDs', () => {
    expect(getCloudinaryUrl('https://example.com/image.jpg')).toBe('')
  })

  it('caps responsive source widths at 900px', () => {
    const srcset = getResponsiveSrcSet('freedomcosmeticshop/products/example', [300, 600, 900, 1200])
    expect(srcset).toContain('900w')
    expect(srcset).not.toContain('1200w')
  })

  it('prefers a structured primary image', () => {
    const product = {
      name: 'Test',
      images: ['legacy.jpg'],
      productImages: [
        { url: 'second.jpg', publicId: 'second', isPrimary: false, altText: 'Second', imageType: 'PACKAGING', sortOrder: 1 },
        { url: 'main.jpg', publicId: 'main', isPrimary: true, altText: 'Main', imageType: 'PRODUCT', sortOrder: 2 },
      ],
    }
    expect(getProductPrimaryImage(product)?.url).toBe('main.jpg')
    expect(getProductImageGallery(product)[0].url).toBe('main.jpg')
  })
})
