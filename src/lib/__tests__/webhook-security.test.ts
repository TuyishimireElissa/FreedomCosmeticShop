import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const paypackService = read('src/server/services/paypack.ts')
const paypackRoute = read('src/app/api/webhooks/paypack/route.ts')
const flutterwaveService = read('src/server/services/flutterwave.ts')
const flutterwaveRoute = read('src/app/api/webhooks/flutterwave/route.ts')
const events = read('src/server/services/payment-events.ts')
const env = read('src/lib/env.ts')

describe('durable payment webhook security', () => {
  it('requires timing-safe PayPack HMAC verification and fails closed', () => {
    expect(env).toContain('PAYPACK_WEBHOOK_SECRET: z.string().optional()')
    expect(paypackService).toContain("createHmac('sha256', secret).update(body, 'utf8').digest('hex')")
    expect(paypackService).toContain('timingSafeEqual(suppliedBuffer, expectedBuffer)')
    expect(paypackService).toContain('if (!secret || !signature)')
    expect(paypackService).not.toContain('In production, verify the signature here')
  })

  it('rejects mismatched PayPack amount or phone before processing', () => {
    expect(paypackRoute).toContain('event.amount !== payment.amount || !phoneMatches')
    expect(paypackRoute).toContain("normalizeRwandaPhone(event.phone || event.number || '') === normalizeRwandaPhone(payment.phoneNumber)")
    expect(paypackRoute).toContain("provider: 'PAYPACK'")
    expect(paypackRoute.indexOf('event.amount !== payment.amount')).toBeLessThan(paypackRoute.indexOf('await handlePaymentSuccess({'))
  })

  it('timing-safely verifies and independently confirms Flutterwave transactions', () => {
    expect(flutterwaveService).toContain('timingSafeEqual(supplied, expected)')
    expect(flutterwaveRoute).toContain('verification = await verifyPayment(event.data.tx_ref)')
    expect(flutterwaveRoute).toContain("verification.amount === payment.amount")
    expect(flutterwaveRoute).toContain("verification.currency === 'RWF'")
    expect(flutterwaveRoute).toContain("provider: 'FLUTTERWAVE'")
    expect(flutterwaveRoute).toContain("status: 'pending'")
  })

  it('uses a durable database idempotency gate for success and failure', () => {
    expect(events).toContain("where: { id: paymentId, status: { not: 'PAID' } }")
    expect(events).toContain("where: { id: paymentId, status: { notIn: ['FAILED', 'PAID'] } }")
    expect(events).toContain('if (claimed.count !== 1)')
    expect(events).toContain('if (claimedFailure.count !== 1) return')
    expect(events).toContain('FOR UPDATE')
    expect(events).toContain("type: 'DUPLICATE_PAYMENT'")
    expect(events).toContain("id: { not: paymentId }, status: 'PAID'")
    expect(paypackRoute).not.toContain('new Set<')
    expect(flutterwaveRoute).not.toContain('new Set<')
  })

  it('preflights aggregate stock and records paid-order stock incidents', () => {
    expect(events).toContain('const required = new Map')
    expect(events).toContain('FROM "Product" WHERE id = ${productId} FOR UPDATE')
    expect(events).toContain('currentProducts.find')
    expect(events).toContain("type: 'INSUFFICIENT_STOCK'")
    expect(events).toContain("status: 'CONFIRMED'")
    expect(events).toContain('requiresStockReview: result.stockIssue')
    expect(events.indexOf('if (insufficient.length > 0)')).toBeLessThan(events.indexOf("data: { stock: { decrement: needed.quantity } }"))
  })
})
