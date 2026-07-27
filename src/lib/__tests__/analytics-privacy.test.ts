import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ANALYTICS_CONSENT_KEY,
  EVENTS,
  getDeviceType,
  setAnalyticsConsent,
  trackEvent,
} from '@/lib/analytics'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const schema = read('prisma/schema.prisma')
const service = read('src/lib/analytics.ts')
const api = read('src/app/api/analytics/track/route.ts')
const hook = read('src/hooks/useAnalytics.ts')
const consent = read('src/components/analytics/AnalyticsConsent.tsx')
const siteChrome = read('src/components/layout/SiteChrome.tsx')
const product = read('src/components/products/ProductDetailClient.tsx')
const cartStore = read('src/store/useStore.ts')
const cartHook = read('src/hooks/useCart.ts')
const checkout = read('src/app/checkout/page.tsx')
const paymentReturn = read('src/app/checkout/payment-return/page.tsx')
const review = read('src/components/reviews/ReviewSubmissionForm.tsx')
const wholesale = read('src/components/wholesale/WholesaleView.tsx')
const quiz = read('src/components/quiz/RoutineQuiz.tsx')
const english = read('src/lib/i18n/translations/en.ts')
const kinyarwanda = read('src/lib/i18n/translations/rw.ts')

class MemoryStorage {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

function browser(consentValue?: 'granted' | 'denied') {
  const localStorage = new MemoryStorage()
  const sessionStorage = new MemoryStorage()
  if (consentValue) localStorage.setItem(ANALYTICS_CONSENT_KEY, consentValue)
  vi.stubGlobal('window', { localStorage, sessionStorage, location: { pathname: '/products/private', search: '?phone=0780000000' } })
  vi.stubGlobal('navigator', { userAgent: 'Mozilla Android Mobile' })
  return { localStorage, sessionStorage }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('privacy-safe consent-gated analytics', () => {
  it('does not send events without explicit consent and stops immediately after opt-out', async () => {
    browser()
    const request = vi.fn().mockResolvedValue(new Response('{}', { status: 202 }))
    vi.stubGlobal('fetch', request)
    await trackEvent({ event: EVENTS.PAGE_VIEW })
    expect(request).not.toHaveBeenCalled()

    setAnalyticsConsent(true)
    await trackEvent({ event: EVENTS.PAGE_VIEW })
    expect(request).toHaveBeenCalledTimes(1)

    setAnalyticsConsent(false)
    await trackEvent({ event: EVENTS.PAGE_VIEW })
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('sends only pathname, coarse device, language, random session and allow-listed metadata', async () => {
    browser('granted')
    const request = vi.fn().mockResolvedValue(new Response('{}', { status: 202 }))
    vi.stubGlobal('fetch', request)
    await trackEvent({ event: EVENTS.ADD_TO_CART, path: '/products/item?phone=0780000000', productId: 'p1', metadata: { quantity: 2, source: 'button' } })
    const init = request.mock.calls[0][1] as RequestInit
    const payload = JSON.parse(String(init.body)) as Record<string, unknown>
    expect(payload.path).toBe('/products/item')
    expect(payload.device).toBe('mobile')
    expect(payload.language).toBe('rw')
    expect(payload.productId).toBe('p1')
    expect(payload).not.toHaveProperty('name')
    expect(payload).not.toHaveProperty('phone')
    expect(payload).not.toHaveProperty('address')
    expect(payload).not.toHaveProperty('userHash')
    expect(String(init.body)).not.toContain('0780000000')
  })

  it('classifies only coarse device types', () => {
    expect(getDeviceType('Mozilla iPad')).toBe('tablet')
    expect(getDeviceType('Mozilla Android Mobile')).toBe('mobile')
    expect(getDeviceType('Mozilla Windows')).toBe('desktop')
  })

  it('defines a schema with hashes and safe context but no direct PII columns', () => {
    const model = schema.slice(schema.indexOf('model AnalyticsEvent {'), schema.indexOf('// =============================================================================', schema.indexOf('model AnalyticsEvent {')))
    for (const field of ['event', 'path', 'productId', 'device', 'district', 'language', 'paymentMethod', 'sessionHash', 'userHash', 'currency']) expect(model).toMatch(new RegExp(`\\b${field}\\b`))
    for (const forbidden of ['customerName', 'phone', 'address', 'momoRef', 'cardNumber', 'password', 'nationalId']) expect(model).not.toContain(forbidden)
    expect(model).toContain('searchQueryHash')
    expect(model).not.toMatch(/\bsearchQuery\s+String/)
  })

  it('server-validates strict allowlists and computes sensitive derivations itself', () => {
    expect(api).toContain('schema.safeParse(await request.json())')
    expect(api).toContain('.strict()')
    expect(api).toContain('getAllDistricts().includes(data.district)')
    expect(api).toContain('createHmac(\'sha256\', secret)')
    expect(api).toContain('searchQueryHash: null')
    expect(api).toContain("currency: 'RWF'")
    expect(api).toContain('isKigali: data.district ? kigaliDistricts.has(data.district) : false')
    expect(api).not.toContain('data.userHash')
    expect(api).not.toContain('data.isKigali')
    expect(api).not.toContain('data.customerName')
  })

  it('never reads cookies or sends raw search terms from the client service or hook', () => {
    expect(service).not.toContain('document.cookie')
    expect(service).not.toContain('searchQuery')
    expect(service).not.toContain('userId')
    expect(hook).toContain('The raw query may contain PII')
    expect(hook).not.toContain('searchQuery: search')
    expect(hook).not.toContain('searchParams.toString()')
  })

  it('provides equal consent choices and an immediate settings opt-out', () => {
    expect(consent).toContain("setAnalyticsConsent(granted)")
    expect(consent).toContain("t('analytics_consent.decline')")
    expect(consent).toContain("t('analytics_consent.accept')")
    expect(consent).toContain('aria-pressed={choice === \'denied\'}')
    expect(consent).toContain('aria-pressed={choice === \'granted\'}')
    expect(siteChrome).toContain('<AnalyticsPageTracker />')
    expect(english).toMatch(/analytics_consent:/)
    expect(kinyarwanda).toMatch(/analytics_consent:/)
    expect(kinyarwanda).toMatch(/status_off:.*\/\/ verified-rw/)
  })

  it('integrates only safe identifiers and funnel fields into key customer flows', () => {
    expect(product).toContain('trackProductView({')
    expect(cartStore).toContain('EVENTS.ADD_TO_CART')
    expect(cartStore).toContain('EVENTS.REMOVE_FROM_CART')
    expect(cartHook).toContain('EVENTS.ADD_TO_CART')
    expect(checkout).toContain('trackAddressCompleted(address.district)')
    expect(checkout).toContain('trackPaymentSelected(nextMethod)')
    expect(checkout).toContain('trackPaymentStarted(paymentMethod, order.total)')
    expect(checkout).toContain('trackPurchaseCompleted(order.total, paymentMethod, address.district)')
    expect(paymentReturn).toContain("trackPurchaseCompleted(data.order.total, 'CARD', '')")
    expect(review).toContain('trackReviewSubmitted(productId)')
    expect(wholesale).toContain('trackWholesaleApplicationCompleted()')
    expect(quiz).toContain('trackQuizCompleted()')
  })
})
