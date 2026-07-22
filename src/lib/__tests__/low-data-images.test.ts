import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildImageUrl,
  getResponsiveSrcSet,
  IMAGE_QUALITY,
  IMAGE_SIZES,
  optimizeCloudinaryUrl,
} from '@/lib/cloudinary-images'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const helper = read('src/lib/cloudinary-images.ts')
const smartImage = read('src/components/ui/SmartImage.tsx')
const productCard = read('src/components/storefront/ProductCard.tsx')
const gallery = read('src/components/products/ProductImageGallery.tsx')

describe('low-data responsive images', () => {
  it('defines Rwanda-mobile widths and eco quality', () => {
    expect(IMAGE_SIZES.card).toEqual({ lowData: 240, mobile: 320, desktop: 640 })
    expect(IMAGE_SIZES.detail).toEqual({ lowData: 480, mobile: 640, desktop: 1024 })
    expect(IMAGE_SIZES.hero.desktop).toBe(1024)
    expect(IMAGE_QUALITY.lowData).toBe('auto:eco')
    expect(helper).not.toContain('width: 1920')
  })

  it('builds clamped automatic-format Cloudinary URLs', () => {
    const url = buildImageUrl({ publicId: 'freedomcosmeticshop/products/test', width: 1920, quality: 'auto:eco' })
    expect(url).toContain('/w_1024,')
    expect(url).toContain('q_auto:eco')
    expect(url).toContain('f_auto')
    expect(url).toContain('dpr_auto')
    expect(buildImageUrl({ publicId: 'https://example.com/x', width: 320 })).toBe('')
    expect(buildImageUrl({ publicId: '../private', width: 320 })).toBe('')
  })

  it('returns smaller card candidates in low-data mode', () => {
    const low = getResponsiveSrcSet('freedomcosmeticshop/products/test', { context: 'card', isLowData: true })
    expect(low.srcSet).toContain('240w')
    expect(low.srcSet).toContain('320w')
    expect(low.srcSet).not.toContain('640w')
    expect(low.src).toContain('q_auto:eco')

    const normal = getResponsiveSrcSet('freedomcosmeticshop/products/test', { context: 'card' })
    expect(normal.srcSet).toContain('320w')
    expect(normal.srcSet).toContain('640w')
    expect(normal.src).toContain('q_auto:good')
  })

  it('uses a low-data-aware Cloudinary loader with lazy loading', () => {
    expect(smartImage).toContain('const { isLowData } = useLowData()')
    expect(smartImage).toContain('Math.min(requestedWidth, maxWidth)')
    expect(smartImage).toContain("quality = isLowData ? IMAGE_QUALITY.lowData : IMAGE_QUALITY.normal")
    expect(smartImage).toContain('hasTransformableFallback')
    expect(smartImage).toContain('optimizeCloudinaryUrl(fallbackSrc')
    expect(smartImage).toContain("loading={priority ? undefined : 'lazy'}")
    expect(smartImage).toContain('onError={() => setFailed(true)}')

    const legacy = optimizeCloudinaryUrl(
      'https://res.cloudinary.com/dohoc0tmp/image/fetch/f_auto,q_auto,w_1200/https://example.com/product.jpg',
      { width: 320, quality: IMAGE_QUALITY.lowData },
    )
    expect(legacy).toContain('w_320,c_fill,g_auto,q_auto:eco,f_auto,dpr_auto')
    expect(legacy).not.toContain('w_1200')
  })

  it('uses low-data Cloudinary card URLs and responsive detail galleries', () => {
    expect(productCard).toContain('const { isLowData } = useLowData()')
    expect(productCard).toContain("compact || isLowData ? 'CARD_MOBILE' : 'CARD_DESKTOP'")
    expect(productCard).toContain('quality: isLowData ? IMAGE_QUALITY.lowData : IMAGE_QUALITY.normal')
    expect(productCard).toContain('width: compact || isLowData ? 320 : 640')
    expect(gallery).toContain('context="detail"')
    expect(gallery).toContain('context="thumbnail"')
  })
})
