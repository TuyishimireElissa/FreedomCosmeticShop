import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')

describe('launch-critical checkout readiness', () => {
  it('reports a real database connection from the health route', () => {
    const route = read('src/app/api/health/route.ts')
    expect(route).toContain('await prisma.$queryRaw`SELECT 1`')
    expect(route).toContain("{ status: 'ok', database: 'connected' }")
    expect(route).toContain("{ status: 'error', error: 'Database unavailable' }")
  })

  it('keeps order totals, delivery, stock, and coupons server-authoritative', () => {
    const route = read('src/app/api/orders/create/route.ts')
    expect(route).toContain('const subtotal = orderItems.reduce')
    expect(route).toContain('calculateDelivery(input.district, subtotal - discountAmount)')
    expect(route).toContain('stock: { gte: needed.quantity }')
    expect(route).toContain("status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'RETURNED'] }")
    expect(route).toContain("couponId && input.paymentMethod === 'COD'")
  })

  it('consumes online-payment coupons only behind the durable payment gate', () => {
    const events = read('src/server/services/payment-events.ts')
    const gate = events.indexOf("where: { id: paymentId, status: { not: 'PAID' } }")
    const coupon = events.indexOf('if (order.couponId)')
    expect(gate).toBeGreaterThan(-1)
    expect(coupon).toBeGreaterThan(gate)
  })

  it('uses E.164 Rwanda numbers for both production SMS providers', () => {
    const sms = read('src/server/services/sms.ts')
    expect(sms.match(/const normalized = normalizeRwandaPhone\(to\)/g)).toHaveLength(2)
    expect(sms).not.toContain('normalizeRwandaPhoneSafe(to).replace("+", "")')
  })

  it('sends the paid-order confirmation only after verified payment processing', () => {
    const webhook = read('src/app/api/webhooks/paypack/route.ts')
    const events = read('src/server/services/payment-events.ts')
    expect(webhook).toContain('verifyWebhookEvent(body, signature)')
    expect(webhook).toContain('event.amount !== payment.amount')
    expect(webhook).toContain('handlePaymentSuccess')
    expect(events).toContain('await sendOrderConfirmation({')
    expect(events).toContain('paymentConfirmed: true')
  })

  it('uses cost-12 bcrypt for newly created and reset passwords', () => {
    expect(read('src/lib/auth.ts')).toContain('const BCRYPT_ROUNDS = 12')
  })

  it('contains no routine console.log calls in production app or server code', () => {
    for (const path of [
      'src/app/api/payments/card/route.ts',
      'src/app/api/webhooks/flutterwave/route.ts',
      'src/app/api/webhooks/paypack/route.ts',
      'src/server/services/email.ts',
      'src/server/services/flutterwave.ts',
      'src/server/services/payment-events.ts',
      'src/server/services/paypack.ts',
      'src/server/services/sms-queue.ts',
      'src/server/services/sms-scheduler.ts',
      'src/server/services/sms.ts',
    ]) expect(read(path), path).not.toContain('console.log')
  })
})
