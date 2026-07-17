import { describe, expect, it } from 'vitest'
import {
  getCloudinaryUrl,
  getProductImageGallery,
  getProductPrimaryImage,
  getResponsiveSrcSet,
} from '@/lib/cloudinary-images'

describe('Cloudinary product image helpers', () => {
  it('uses a 320px automatic-format transform for mobile cards', () => {
    const url = getCloudinaryUrl('freedomcosmeticshop/products/example', 'CARD_MOBILE')
    expect(url).toContain('/w_320,h_320,')
    expect(url).toContain('q_auto:good')
    expect(url).toContain('f_auto')
    expect(url).toContain('dpr_auto')
  })

  it('rejects full URLs passed as public IDs', () => {
    expect(getCloudinaryUrl('https://example.com/image.jpg')).toBe('')
  })

  it('caps responsive source widths at 1024px', () => {
    const srcset = getResponsiveSrcSet('freedomcosmeticshop/products/example', [320, 640, 1024, 1920])
    expect(srcset).toContain('1024w')
    expect(srcset).not.toContain('1920w')
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
