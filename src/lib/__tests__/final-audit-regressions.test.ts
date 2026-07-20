import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')
const config = read('next.config.js')
const middleware = read('middleware.ts')
const business = read('src/lib/business-config.ts')
const env = read('src/lib/env.ts')
const momo = read('src/app/api/payments/momo/route.ts')
const legacyPayment = read('src/server/services/payment.ts')
const storage = read('src/server/services/storage.ts')
const blogPage = read('src/app/blog/page.tsx')
const blogClient = read('src/components/blog/BlogListingClient.tsx')
const cartUpdate = read('src/app/api/cart/update/route.ts')
const legacyReviews = read('src/app/api/reviews/route.ts')

describe('final comprehensive audit regressions', () => {
  it('uses one authoritative Next config and keeps build type checking enabled', () => {
    expect(existsSync('next.config.ts')).toBe(false)
    expect(config).toContain("output: 'standalone'")
    expect(config).not.toContain('ignoreBuildErrors')
    expect(config).not.toContain('STORE_WHATSAPP')
  })

  it('does not permit unsafe-eval in the production CSP', () => {
    expect(config).not.toContain("'unsafe-eval'")
    expect(middleware).not.toContain("'unsafe-eval'")
    for (const directive of ["object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'"]) {
      expect(middleware).toContain(directive)
    }
  })

  it('removes unsupported leadership and blanket-authenticity claims', () => {
    expect(business).not.toMatch(/Rwanda's #1|100% authentic|Authentic Products Guaranteed/i)
    expect(business).toContain("timezone: 'Africa/Kigali (CAT - UTC+2)'")
  })

  it('does not hardcode the Cloudinary API key or secret in source defaults', () => {
    expect(env).not.toContain(['5245', '78837153868'].join(''))
    expect(env).toContain('CLOUDINARY_API_KEY: z.string().min(1).optional()')
    expect(env).toContain('CLOUDINARY_API_SECRET: z.string().min(1).optional()')
  })

  it('binds Mobile Money initiation to the order and rate limits attempts', () => {
    expect(momo).toContain('requireAuth')
    expect(momo).toContain("auth.id !== order.userId")
    expect(momo).toContain("checkoutPhone !== normalizedPhone")
    expect(momo).toContain("rateLimit(`payment-initiation:${ip}`")
    expect(momo).toContain("error: 'INVALID_ORIGIN'")
  })

  it('fails closed when production payment processing is disabled', () => {
    expect(momo).toContain("process.env.NODE_ENV !== 'production' && !features.realPayments")
    expect(momo).toContain("error: 'PAYMENTS_NOT_CONFIGURED'")
    expect(legacyPayment).not.toMatch(/status:\s*["']PAID["'][\s\S]{0,100}simulat/i)
    expect(legacyPayment).toContain('success: false')
  })

  it('never reports stub verification or image deletion as successful', () => {
    expect(legacyPayment).not.toContain('Verified (stub)')
    expect(storage).not.toContain('Image deletion (stub)')
    expect(storage).toContain('success: false')
  })

  it('provides a real bilingual blog listing route', () => {
    expect(blogPage).toContain('prisma.blogPost.findMany')
    expect(blogPage).toContain("path: '/blog'")
    expect(blogClient).toContain("useLanguage")
    expect(blogClient).toContain("t('blog.read_more')")
  })

  it('supports the documented PUT cart update compatibility route', () => {
    expect(cartUpdate).toContain('export async function PUT')
    expect(cartUpdate).toContain('return updateCart(request)')
  })

  it('allows only masked, explicitly selected fields in the legacy public review response', () => {
    expect(legacyReviews).toContain('select: {')
    expect(legacyReviews).toContain('anonymizeName(user.name)')
    expect(legacyReviews).not.toContain('include: {')
    expect(legacyReviews).not.toContain('...r,')
  })

  it('removes unused synthetic and legacy storefront implementations', () => {
    for (const path of [
      'src/lib/fallbackData.ts',
      'src/components/storefront/CheckoutView.tsx',
      'src/components/storefront/LegacyCartView.tsx',
      'src/components/storefront/HomeView.tsx',
      'src/components/storefront/ProductDetailView.tsx',
      'src/components/storefront/ReviewsSection.tsx',
      'src/components/auth/AccountView.tsx',
      'src/components/auth/LoginView.tsx',
      'src/components/auth/RegisterView.tsx',
      'src/components/storefront/Header.tsx',
      'src/components/storefront/Footer.tsx',
      'src/components/storefront/AnnouncementBar.tsx',
      'src/components/storefront/PaymentBar.tsx',
    ]) expect(existsSync(path)).toBe(false)
  })
})
