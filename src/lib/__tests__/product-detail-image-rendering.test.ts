import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')
const detail = read('src/components/products/ProductDetailClient.tsx')
const gallery = read('src/components/products/ProductImageGallery.tsx')
const card = read('src/components/storefront/ProductCard.tsx')
const api = read('src/app/api/products/[slug]/route.ts')
const publicProduct = read('src/lib/public-product.ts')
const cartDrawer = read('src/components/storefront/CartDrawer.tsx')

describe('reliable product image rendering', () => {
  it('selects both legacy and structured image fields in the detail API', () => {
    expect(api).toContain('select: PUBLIC_PRODUCT_SELECT')
    expect(publicProduct).toContain('images: true')
    expect(publicProduct).toContain('productImages: {')
    expect(publicProduct).toContain('url: true')
    expect(publicProduct).toContain('publicId: true')
  })

  it('passes both image collections into the detail gallery', () => {
    expect(detail).toContain('productImages={product.productImages || []}')
    expect(detail).toContain('legacyImages={product.images || []}')
    expect(gallery).toContain('getProductImageGallery({ productImages, images: legacyImages')
  })

  it('renders the resolved URL directly with a native image element', () => {
    expect(gallery).toContain('<img')
    expect(gallery).toContain('src={optimizedImageUrl(activeImage.url, 800)}')
    expect(gallery).toContain('h-full w-full object-contain p-8')
    expect(gallery).toContain('onError={() => setFailedUrl(activeImage.url)}')
    expect(gallery).not.toContain('<SmartImage')
  })

  it('only shows a numeric gallery position for multiple images', () => {
    expect(gallery).toContain('gallery.length > 1 && <p')
    expect(gallery).toContain('{activeIndex + 1} / {gallery.length}')
    expect(gallery).not.toContain("t('product.photos_count'")
  })

  it('uses the same direct URL strategy on cards and keeps empty reviews in the reviews section', () => {
    expect(card).toContain('src={optimizedImageUrl(imageUrl, 500)}')
    expect(card).toContain('onError={() => setImageFailed(true)}')
    expect(cartDrawer).toContain('src={optimizedImageUrl(item.image, 80)}')
    expect(detail).not.toContain("t('product.no_reviews')")
    expect(detail).toContain('<ProductTabs product={product} />')
  })
})
