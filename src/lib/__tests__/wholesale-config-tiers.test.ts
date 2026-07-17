import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { WHOLESALE_CONFIG } from '@/lib/wholesale-config'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

const service = read('src/server/services/wholesale.ts')
const infoApi = read('src/app/api/wholesale/info/route.ts')
const pricingApi = read('src/app/api/admin/products/[id]/pricing/route.ts')
const approvalApi = read('src/app/api/admin/wholesale/applications/[id]/approve/route.ts')
const orderApi = read('src/app/api/orders/route.ts')

describe('owner-approved wholesale configuration', () => {
  it('uses product-specific tiers with no invented fallback tier schedule', () => {
    expect(WHOLESALE_CONFIG.pricing.mode).toBe('PRODUCT_ONLY')
    expect(WHOLESALE_CONFIG.pricing.allowAccountLevelDiscount).toBe(false)
    expect(service).not.toContain('DEFAULT_TIERS')
    expect(service).not.toContain('getDefaultTiers')
    expect(service).toContain('No owner-configured tier means no wholesale discount.')
    expect(pricingApi).toContain('const tiers = product.pricing?.tiers || []')
    expect(pricingApi).not.toContain('default tiers')
  })

  it('derives saved discount percentages from configured RWF prices', () => {
    expect(pricingApi).toContain('(product.price - tier.pricePerUnit) / product.price')
    expect(pricingApi).toContain('Wholesale pricing tiers cannot overlap')
    expect(pricingApi).toContain('A tier maximum cannot be below its minimum')
  })

  it('keeps the basket minimum unconfigured and does not enforce 50,000 RWF', () => {
    expect(WHOLESALE_CONFIG.minimumOrderRwf).toBeNull()
    expect(orderApi).toContain('WHOLESALE_CONFIG.minimumOrderRwf')
    expect(orderApi).not.toContain('subtotal < 50_000')
    expect(infoApi).toContain('minimumOrder: WHOLESALE_CONFIG.minimumOrderRwf')
  })

  it('fails closed because wholesale credit is not operational', () => {
    expect(WHOLESALE_CONFIG.credit.enabled).toBe(false)
    expect(service).toContain('if (!WHOLESALE_CONFIG.credit.enabled)')
    expect(orderApi).toContain('if (isCreditOrder && !WHOLESALE_CONFIG.credit.enabled)')
    expect(approvalApi).not.toContain('wholesaleCredit.upsert')
    expect(approvalApi).not.toContain('creditLimit: z.number')
    expect(approvalApi).toContain('approvedCreditLimit: 0')
  })

  it('publishes no unsupported global discount or approval-time promise', () => {
    expect(WHOLESALE_CONFIG.applicationReviewTargetHours).toBeNull()
    expect(infoApi).toContain('maxDiscount: null')
    expect(infoApi).toContain('applicationReviewTargetHours: WHOLESALE_CONFIG.applicationReviewTargetHours')
    expect(infoApi).not.toMatch(/24-48|30% discount|30 days/i)
  })
})
