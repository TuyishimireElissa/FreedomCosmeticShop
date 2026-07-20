import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { boundedDays, percentage } from '@/lib/analytics-overview'

const route = readFileSync(resolve(process.cwd(), 'src/app/api/admin/analytics/overview/route.ts'), 'utf8')

describe('privacy-safe admin analytics overview', () => {
  it('uses custom JWT permission enforcement and never NextAuth', () => {
    expect(route).toContain('requirePermission(PERMISSIONS.ANALYTICS_READ)')
    expect(route).toContain('error instanceof AuthError')
    expect(route).not.toContain('next-auth')
    expect(route).not.toContain('getServerSession')
    expect(route).not.toContain('authOptions')
  })

  it('bounds reporting periods', () => {
    expect(boundedDays(null)).toBe(30)
    expect(boundedDays('1')).toBe(1)
    expect(boundedDays('365')).toBe(365)
    expect(boundedDays('0')).toBeNull()
    expect(boundedDays('366')).toBeNull()
    expect(boundedDays('not-a-number')).toBeNull()
    expect(route).toContain("error: 'INVALID_PERIOD'")
  })

  it('calculates transparent event ratios without divide-by-zero errors', () => {
    expect(percentage(2, 4)).toBe(50)
    expect(percentage(1, 3)).toBe(33.33)
    expect(percentage(1, 0)).toBe(0)
    expect(route).toContain('checkoutCompletionRate: percentage(purchases, beginCheckout)')
    expect(route).toContain('addToCartToPurchaseEventRate: percentage(purchases, addToCarts)')
    expect(route).not.toContain('cartAbandonmentRate')
  })

  it('returns aggregate event segments without customer identifiers', () => {
    for (const segment of ['byDevice', 'byDistrict', 'byLanguage', 'byPaymentMethod', 'byCategory', 'topProducts']) expect(route).toContain(segment)
    expect(route).not.toContain('customerName')
    expect(route).not.toContain('customerPhone')
    expect(route).not.toMatch(/\baddress\s*:/)
    expect(route).not.toContain('sessionHash: row')
    expect(route).not.toContain('userHash: row')
  })

  it('labels client-reported values and consent limitations honestly', () => {
    expect(route).toContain('trackedPurchaseValue')
    expect(route).not.toContain('totalRevenue')
    expect(route).toContain('consentedEventsOnly: true')
    expect(route).toContain('trackedPurchaseValueIsClientReported: true')
    expect(route).toContain('ratesAreEventRatiosNotUniqueCustomerRates: true')
    expect(route).toContain('rawSearchQueriesStored: false')
  })

  it('keeps admin analytics responses private and non-cacheable', () => {
    expect(route).toContain("'Cache-Control': 'private, no-store, max-age=0'")
    expect(route).toContain("error: 'ANALYTICS_UNAVAILABLE'")
    expect(route).not.toMatch(/\bany\b/)
  })
})
