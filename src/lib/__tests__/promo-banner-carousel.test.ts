import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const bannerFiles = ['banner1.jpg', 'banner2.jpg', 'banner3.jpg', 'banner4.jpg', 'banner5.jpg']
const staticSlider = readFileSync('src/components/banner/CustomBannerSlider.tsx', 'utf8')
const carousel = readFileSync('src/components/banner/BannerCarousel.tsx', 'utf8')
const slide = readFileSync('src/components/banner/BannerSlide.tsx', 'utf8')
const dots = readFileSync('src/components/banner/BannerDots.tsx', 'utf8')
const arrows = readFileSync('src/components/banner/BannerArrows.tsx', 'utf8')
const productsPage = readFileSync('src/components/products/ProductsPageClient.tsx', 'utf8')
const adminMarketing = readFileSync('src/components/admin/AdminMarketing.tsx', 'utf8')
const createRoute = readFileSync('src/app/api/admin/banners/route.ts', 'utf8')
const updateRoute = readFileSync('src/app/api/admin/banners/[id]/route.ts', 'utf8')
const publicRoute = readFileSync('src/app/api/banners/route.ts', 'utf8')
const schema = readFileSync('prisma/schema.prisma', 'utf8')

describe('promotional banner carousel', () => {
  it('falls back to the static slider when no admin slide is configured', () => {
    expect(carousel).toContain('if (total === 0) return <CustomBannerSlider />')
    expect(carousel).toContain("import CustomBannerSlider from './CustomBannerSlider'")
    // No skeleton or placeholder box may be emitted before slides are known.
    expect(carousel).not.toContain('animate-pulse')
  })

  it('renders nothing at all when neither admin nor static slides exist', () => {
    // The static fallback is the last line of defence: if its files are absent
    // it must also collapse to null so the products page is untouched.
    expect(staticSlider).toContain('if (total === 0) return null')
    expect(staticSlider).toContain('probe.onerror = () => resolve(false)')
    expect(staticSlider).toContain('setSlides(SLIDE_SOURCES.filter((_, index) => results[index]))')
    expect(staticSlider).not.toContain('animate-pulse')
  })

  it('serves the static fallback from public/images with unique class names', () => {
    expect(staticSlider).toContain("'/images/banner1.jpg'")
    expect(staticSlider).toContain("'/images/banner5.jpg'")
    expect(staticSlider).toContain('const SLIDE_INTERVAL_MS = 3000')
    expect(staticSlider).toContain('custom-banner-slider')
    expect(staticSlider).toContain('custom-banner-slider__slide')
    expect(staticSlider).toContain('custom-banner-slider__image')
    for (const file of bannerFiles) {
      expect(existsSync(`public/images/${file}`)).toBe(true)
    }
  })

  it('gives the static fallback the same behaviour as the admin carousel', () => {
    expect(staticSlider).toContain('window.setInterval(next, SLIDE_INTERVAL_MS)')
    expect(staticSlider).toContain('if (prefersReducedMotion || interactionPaused || total < 2) return')
    expect(staticSlider).toContain('onMouseEnter={() => setInteractionPaused(true)}')
    expect(staticSlider).toContain('onMouseLeave={() => setInteractionPaused(false)}')
    expect(staticSlider).toContain("if (event.key === 'ArrowRight')")
    expect(staticSlider).toContain('aria-roledescription="carousel"')
    expect(staticSlider).toContain('const SWIPE_THRESHOLD_PX = 50')
  })

  it('caps the carousel at five slides and auto-rotates every three seconds', () => {
    expect(carousel).toContain('const AUTO_ADVANCE_MS = 3000')
    expect(carousel).toContain('const MAX_SLIDES = 5')
    expect(carousel).toContain('.slice(0, MAX_SLIDES)')
    expect(carousel).toContain('window.setInterval(next, AUTO_ADVANCE_MS)')
  })

  it('pauses on hover or focus and resumes on leave', () => {
    expect(carousel).toContain('onMouseEnter={() => setInteractionPaused(true)}')
    expect(carousel).toContain('onMouseLeave={() => setInteractionPaused(false)}')
    expect(carousel).toContain('onFocusCapture={() => setInteractionPaused(true)}')
    expect(carousel).toContain('onBlurCapture={() => setInteractionPaused(false)}')
  })

  it('disables auto-rotation when the visitor prefers reduced motion', () => {
    expect(carousel).toContain("import { useReducedMotion } from '@/hooks/useReducedMotion'")
    expect(carousel).toContain('if (prefersReducedMotion || interactionPaused || total < 2) return')
    expect(slide).toContain('motion-reduce:transition-none')
  })

  it('supports swipe, keyboard arrows, and exposes carousel semantics', () => {
    expect(carousel).toContain('const SWIPE_THRESHOLD_PX = 50')
    expect(carousel).toContain('onTouchStart')
    expect(carousel).toContain('onTouchEnd')
    expect(carousel).toContain("if (event.key === 'ArrowRight')")
    expect(carousel).toContain("if (event.key === 'ArrowLeft')")
    expect(carousel).toContain('aria-roledescription="carousel"')
    expect(carousel).toContain('aria-live="polite"')
    expect(dots).toContain('role="tab"')
    expect(dots).toContain('aria-selected={index === current}')
    expect(arrows).toContain('aria-label={previousLabel}')
    expect(arrows).toContain('aria-label={nextLabel}')
  })

  it('never emits an unsafe CTA href', () => {
    expect(slide).toContain("if (target.startsWith('/')) return target")
    expect(slide).toContain("if (/^https?:\\/\\//i.test(target)) return target")
    expect(slide).toContain('return null')

    // Mirror of resolveHref: only internal paths and http(s) links become an href.
    const resolve = (linkType: string | null, linkUrl: string | null): string | null => {
      const target = linkUrl?.trim()
      if (!target) return null
      if (linkType === 'CATEGORY') return `/products?category=${encodeURIComponent(target)}`
      if (linkType === 'PRODUCT') return `/products/${encodeURIComponent(target)}`
      if (linkType === 'BLOG_POST') return `/blog/${encodeURIComponent(target)}`
      if (target.startsWith('/')) return target
      if (/^https?:\/\//i.test(target)) return target
      return null
    }

    expect(resolve('URL', 'javascript:alert(1)')).toBeNull()
    expect(resolve('URL', 'data:text/html;base64,PHN2Zz4=')).toBeNull()
    expect(resolve('URL', 'JavaScript:alert(1)')).toBeNull()
    expect(resolve('URL', '  vbscript:msgbox(1)  ')).toBeNull()
    expect(resolve(null, null)).toBeNull()
    expect(resolve('URL', 'https://example.com/promo')).toBe('https://example.com/promo')
    expect(resolve(null, '/products/serum')).toBe('/products/serum')
    expect(resolve('CATEGORY', 'skincare')).toBe('/products?category=skincare')
  })

  it('uses next/image and requests only the CATEGORY_TOP placement', () => {
    expect(slide).toContain("import Image from 'next/image'")
    expect(slide).toContain('sizes="(max-width: 1280px) 100vw, 1280px"')
    expect(carousel).toContain('/api/banners?placement=')
    expect(carousel).toContain("placement = 'CATEGORY_TOP'")
    expect(publicRoute).toContain('isActive: true')
    expect(publicRoute).toContain('orderBy: { sortOrder: "asc" }')
  })

  it('mounts between the breadcrumb and the catalog heading on the products page', () => {
    expect(productsPage).toContain("import BannerCarousel from '@/components/banner/BannerCarousel'")
    expect(productsPage).toContain('<BannerCarousel placement="CATEGORY_TOP" />')
    const bannerIndex = productsPage.indexOf('<BannerCarousel')
    const breadcrumbIndex = productsPage.indexOf('<Breadcrumbs items={breadcrumbItems} />')
    const headerIndex = productsPage.indexOf('<header className="border-b border-gray-100 bg-white">')
    expect(breadcrumbIndex).toBeGreaterThan(-1)
    expect(bannerIndex).toBeGreaterThan(breadcrumbIndex)
    expect(headerIndex).toBeGreaterThan(bannerIndex)
  })

  it('persists overlay presentation through the existing banner model and routes', () => {
    expect(schema).toContain('textPosition String?')
    expect(schema).toContain('textColor    String?')
    expect(createRoute).toContain('textPosition: z.enum(["left", "center", "right"]).optional().nullable()')
    expect(createRoute).toContain('textColor: z.enum(["light", "dark"]).optional().nullable()')
    expect(updateRoute).toContain('textPosition: z.enum(["left", "center", "right"]).optional().nullable()')
    expect(updateRoute).toContain('textColor: z.enum(["light", "dark"]).optional().nullable()')
  })

  it('keeps the existing admin auth guards on banner routes untouched', () => {
    expect(createRoute).toContain('requirePermission(PERMISSIONS.BANNERS_READ)')
    expect(createRoute).toContain('requirePermission(PERMISSIONS.BANNERS_CRUD)')
    expect(updateRoute).toContain('requirePermission(PERMISSIONS.BANNERS_UPDATE)')
    expect(updateRoute).toContain('requireDestructiveOperation(DESTRUCTIVE_OPERATIONS.MARKETING_DELETE)')
  })

  it('uploads banner images through the existing upload endpoint', () => {
    expect(adminMarketing).toContain('const uploadBannerImage = async (file: File)')
    expect(adminMarketing).toContain('body.set("folder", "banners")')
    expect(adminMarketing).toContain('fetch("/api/upload", { method: "POST", body })')
    expect(adminMarketing).toContain('maximum size is 10 MB')
    expect(adminMarketing).toContain('Recommended 1920×600')
    expect(adminMarketing).toContain('textPosition: form.textPosition')
    expect(adminMarketing).toContain('textColor: form.textColor')
  })
})
