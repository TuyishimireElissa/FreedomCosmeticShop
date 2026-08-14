import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')
const image = read('src/lib/cloudinary-images.ts')
const card = read('src/components/storefront/ProductCard.tsx')
const gallery = read('src/components/products/ProductImageGallery.tsx')
const admin = read('src/components/admin/AdminView.tsx')
const adminProducts = read('src/components/admin/AdminProductManager.tsx')
const adminCustomers = read('src/components/admin/AdminCustomers.tsx')
const productsApi = read('src/app/api/products/route.ts')
const featuredApi = read('src/app/api/products/featured/route.ts')
const categoriesApi = read('src/app/api/categories/route.ts')
const zonesApi = read('src/app/api/delivery/zones/route.ts')
const publicProduct = read('src/lib/public-product.ts')
const providers = read('src/components/Providers.tsx')
const layout = read('src/app/layout.tsx')
const nextConfig = read('next.config.js')
const sw = read('public/sw.js')

describe('slow-network and low-end Android performance', () => {
  it('delivers responsive auto-format Cloudinary images without hiding native images', () => {
    expect(image).toContain('optimizedImageUrl')
    expect(image).toContain('optimizedImageSrcSet')
    expect(image).toContain('f_${format}')
    expect(card).toContain('srcSet={productCardSrcSet(imageUrl, [300, 400, 500])}')
    expect(card).toContain('loading="lazy"')
    expect(card).toContain('decoding="async"')
    expect(card).toContain('animate-pulse motion-reduce:animate-none')
    expect(gallery).toContain('srcSet={optimizedImageSrcSet(activeImage.url, [600, 800])}')
  })

  it('splits Quick View and heavy admin sections by interaction', () => {
    expect(card).toContain("dynamic(() => import('@/components/products/QuickView')")
    for (const section of ['AdminOverview', 'AdminProductManager', 'AdminCustomers', 'AdminAnalytics', 'AdminReports', 'AdminMarketing']) {
      expect(admin).toContain(`dynamic(() => import('./${section}')`)
    }
    expect(admin).toContain('AdminSectionLoading')
  })

  it('uses lean card payloads, public CDN caching, and twelve-item pagination', () => {
    expect(publicProduct).toContain('PUBLIC_PRODUCT_CARD_SELECT')
    expect(publicProduct).toContain('serializePublicProductCard')
    expect(productsApi).toContain('select: PUBLIC_PRODUCT_CARD_SELECT')
    expect(productsApi).toContain("s-maxage=60, stale-while-revalidate=300")
    expect(featuredApi).toContain("s-maxage=60, stale-while-revalidate=300")
    // INTENTIONAL CHANGE, not a regression. /api/categories now drives the
    // navbar and footer, so an owner toggling a category off in admin expects
    // the nav to follow quickly. 300s was too long a cold-load ceiling for
    // that; 60s matches the products and featured routes above. The realtime
    // broadcast still pushes the change instantly — this is only the ceiling
    // for a visitor arriving cold on a CDN edge that has not been purged.
    expect(categoriesApi).toContain("s-maxage=60, stale-while-revalidate=300")
    expect(zonesApi).toContain("s-maxage=3600, stale-while-revalidate=86400")
    expect(productsApi).toContain("params.get('limit') || 12")
  })

  it('paginates admin tables and serves 80px admin thumbnails', () => {
    expect(adminProducts).toContain('params.set("pageSize", "20")')
    expect(adminProducts).toContain('optimizedImageUrl(getAdminPrimaryImage(p), 80)')
    expect(adminCustomers).toContain('params.set("pageSize", "20")')
    expect(adminCustomers).toContain('Customer pages')
  })

  it('optimizes fonts, static caching, package imports, retries, and offline static assets', () => {
    expect(layout).not.toContain("next/font/google")
    expect(layout).toContain('font-sans')
    expect(nextConfig).toContain('minimumCacheTTL: 86400')
    expect(nextConfig).toContain("optimizePackageImports: ['lucide-react', 'recharts']")
    expect(nextConfig).toContain('max-age=31536000, immutable')
    expect(providers).toContain("navigator.serviceWorker.register('/sw.js'")
    expect(providers).toContain('retry: 2')
    expect(sw).toContain("url.pathname.startsWith('/api/')")
    expect(sw).toContain("url.pathname.startsWith('/_next/image')")
    expect(sw).toContain("caches.open(STATIC_CACHE)")
  })
})
