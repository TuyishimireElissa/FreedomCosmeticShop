import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { calculateWholesaleRetention } from '@/server/services/wholesale-retention'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const service = read('src/server/services/wholesale-retention.ts')
const analytics = read('src/app/api/admin/wholesale/analytics/route.ts')
const retentionApi = read('src/app/api/admin/wholesale/retention/route.ts')
const orderApi = read('src/app/api/orders/route.ts')
const checkout = read('src/components/storefront/CheckoutView.tsx')
const paymentEvents = read('src/server/services/payment-events.ts')
const refundApi = read('src/app/api/payments/refund/route.ts')
const kinyarwanda = read('src/lib/i18n/translations/rw.ts')

describe('database-derived wholesale retention calculations', () => {
  it('shows exact zeroes and does not invent churn when there are no paid orders', () => {
    expect(calculateWholesaleRetention([], [], new Date('2026-07-17T00:00:00Z'))).toMatchObject({
      totalOrders: 0,
      totalSpent: 0,
      averageOrderValue: 0,
      ordersPerMonthBps: 0,
      status: 'NO_PAID_ORDERS',
      isChurned: false,
      reorderCount: 0,
      reorderRateBps: 0,
    })
  })

  it('does not claim a recurring monthly rate from one order', () => {
    const metric = calculateWholesaleRetention(
      [{ id: 'order-1', total: 60_000, createdAt: new Date('2026-07-01T00:00:00Z') }],
      [],
      new Date('2026-07-17T00:00:00Z')
    )
    expect(metric).toMatchObject({ totalOrders: 1, totalSpent: 60_000, averageOrderValue: 60_000, ordersPerMonthBps: 0, status: 'NEW', daysSinceLastOrder: 16 })
  })

  it('tracks paid repeat orders and completed reorder conversion in basis points', () => {
    const metric = calculateWholesaleRetention(
      [
        { id: 'order-1', total: 40_000, createdAt: new Date('2026-05-01T00:00:00Z') },
        { id: 'order-2', total: 60_000, createdAt: new Date('2026-05-31T10:29:06Z') },
      ],
      [{ newOrderId: 'order-2' }, { newOrderId: null }],
      new Date('2026-06-10T00:00:00Z')
    )
    expect(metric.totalOrders).toBe(2)
    expect(metric.totalSpent).toBe(100_000)
    expect(metric.averageOrderValue).toBe(50_000)
    expect(metric.ordersPerMonthBps).toBeCloseTo(10_000, -1)
    expect(metric.status).toBe('RETURNING')
    expect(metric.reorderCount).toBe(1)
    expect(metric.reorderRateBps).toBe(5_000)
    expect(metric.isChurned).toBe(false)
  })
})

describe('honest wholesale retention pipeline', () => {
  it('counts only paid, non-cancelled wholesale orders', () => {
    expect(service).toContain("orderType: 'WHOLESALE'")
    expect(service).toContain("status: { notIn: ['CANCELLED', 'RETURNED'] }")
    expect(service).toContain("payments: { some: { status: 'PAID' } }")
    expect(analytics.match(/payments: \{ some: \{ status: "PAID" \} \}/g)?.length).toBeGreaterThanOrEqual(6)
  })

  it('links a recorded reorder to the real new order without trusting another user', () => {
    expect(checkout).toContain("sessionStorage.getItem('wholesaleShoppingMode') === '1'")
    expect(checkout).toContain("sessionStorage.getItem('wholesaleReorderId')")
    expect(checkout).toContain('isWholesale: wholesaleShoppingMode')
    expect(checkout).toContain('wholesaleReorderId,')
    expect(orderApi).toContain('where: { id: data.wholesaleReorderId, userId, newOrderId: null }')
    expect(orderApi).toContain('data: { newOrderId: created.id }')
  })

  it('refreshes metrics after payment, refund, and reorder events', () => {
    expect(paymentEvents).toContain('refreshWholesaleRetentionMetric(order.userId)')
    expect(refundApi).toContain('refreshWholesaleRetentionMetric(order.userId)')
    expect(read('src/app/api/wholesale/reorder/route.ts')).toContain('refreshWholesaleRetentionMetric(user.id)')
  })

  it('publishes zero-safe admin metrics and explicitly disables churn classification', () => {
    for (const source of [analytics, retentionApi]) {
      expect(source).toContain('churnPolicyConfigured: false')
      expect(source).toContain('churnedCustomers: 0')
      expect(source).toContain('reorderAttempts > 0')
    }
  })

  it('provides verified Kinyarwanda retention copy', () => {
    for (const key of ['retention_title', 'retention_paid_only_note', 'retention_paid_customers', 'retention_returning', 'retention_reorders', 'retention_reorder_conversion', 'retention_no_churn_policy']) {
      expect(kinyarwanda).toMatch(new RegExp(`${key}:.*// verified-rw`))
    }
  })
})
