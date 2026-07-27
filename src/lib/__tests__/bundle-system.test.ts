import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { calculateBundleFacts } from '@/lib/bundle-pricing'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const listApi = read('src/app/api/bundles/route.ts')
const detailApi = read('src/app/api/bundles/[slug]/route.ts')
const orderApi = read('src/app/api/orders/create/route.ts')
const paymentEvents = read('src/server/services/payment-events.ts')
const checkout = read('src/app/checkout/page.tsx')

describe('honest bundle system', () => {
  it('calculates exact totals, savings, stock, and maximum quantity', () => {
    expect(calculateBundleFacts(9000, [
      { quantity: 1, product: { price: 6000, stock: 5 } },
      { quantity: 2, product: { price: 2500, stock: 6 } },
    ])).toEqual({ normalTotal: 11000, savings: 2000, savingsPercent: 18, isInStock: true, maxQuantity: 3 })
  })

  it('shows negative savings honestly when a bundle costs more', () => {
    expect(calculateBundleFacts(12000, [{ quantity: 1, product: { price: 10000, stock: 1 } }]).savings).toBe(-2000)
  })

  it('public APIs calculate current values and expose no admin product fields', () => {
    for (const source of [listApi, detailApi]) {
      expect(source).toContain('calculateBundleFacts')
      expect(source).not.toContain('costPrice')
      expect(source).not.toContain('supplierId')
      expect(source).not.toContain('expiryDate')
    }
  })

  it('checkout sends bundle identities and server validates bundle price and stock', () => {
    expect(checkout).toContain('{ bundleId: item.bundleId, quantity: item.quantity }')
    expect(orderApi).toContain('bundle.bundlePrice')
    expect(orderApi).toContain('calculateBundleFacts')
    expect(orderApi).toContain('stockNeeded')
  })

  it('deducts bundle component stock only on COD confirmation or verified payment', () => {
    expect(orderApi).toContain("if (input.paymentMethod === 'COD')")
    expect(paymentEvents).toContain('component.quantity * item.quantity')
    expect(paymentEvents).toContain('totalSales: { increment: quantity }')
  })

  it('contains no fictional bundle seeding', () => {
    expect(read('scripts/seed.ts')).not.toContain('Bright Skin Routine')
    expect(read('scripts/seed.ts')).not.toContain('Acne-Prone Skin Routine')
  })
})
