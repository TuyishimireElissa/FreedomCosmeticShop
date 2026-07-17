import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const stock = read('src/components/a11y/StockStatus.tsx')
const order = read('src/components/a11y/OrderStatusBadge.tsx')
const payment = read('src/components/a11y/PaymentStatusBadge.tsx')
const currentProductCard = read('src/components/storefront/ProductCard.tsx')
const alternateProductCard = read('src/components/ui/ProductCard.tsx')
const currentProductDetail = read('src/components/products/ProductDetailClient.tsx')
const accountOrders = read('src/app/account/orders/page.tsx')
const tracking = read('src/components/storefront/TrackOrderView.tsx')
const wholesaleDashboard = read('src/components/wholesale/WholesaleDashboard.tsx')
const wholesaleInvoices = read('src/components/wholesale/WholesaleInvoices.tsx')
const adminWholesale = read('src/components/admin/AdminWholesale.tsx')
const register = read('src/app/(auth)/register/page.tsx')
const checkout = read('src/app/checkout/page.tsx')
const wholesaleForm = read('src/components/wholesale/WholesaleView.tsx')
const kinyarwanda = read('src/lib/i18n/translations/rw.ts')

describe('non-color-only status indicators', () => {
  it('uses icon, text, and status semantics for every stock state', () => {
    expect(stock.match(/role="status"/g)).toHaveLength(3)
    expect(stock).toContain('<XCircle')
    expect(stock).toContain('<AlertCircle')
    expect(stock).toContain('<CheckCircle2')
    expect(stock).toContain("t('common.sold_out')")
    expect(stock).toContain("t('common.low_stock'")
    expect(stock).toContain("t('common.in_stock')")
    expect(stock).toContain("t('cart.stock_available'")
  })

  it('uses translated icon-and-text badges for order states', () => {
    expect(order).toContain('role="status"')
    for (const state of ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED']) {
      expect(order).toContain(`${state}:`)
    }
    expect(order).toContain('aria-hidden="true"')
    expect(order).toContain('orders.status_')
  })

  it('uses translated icon-and-text badges for payment states', () => {
    expect(payment).toContain('role="status"')
    for (const state of ['PAID', 'PENDING', 'FAILED', 'REFUNDED', 'OVERDUE']) expect(payment).toContain(`${state}:`)
    expect(payment).toContain('accessibility.payment_status_')
  })

  it('applies stock status to current and preserved product surfaces', () => {
    for (const source of [currentProductCard, alternateProductCard, currentProductDetail]) expect(source).toContain('<StockStatus')
    expect(currentProductDetail).not.toContain('Only {product.stock} left!')
  })

  it('applies order and payment badges across customer, wholesale, and admin surfaces', () => {
    expect(accountOrders).toContain('<OrderStatusBadge')
    expect(accountOrders).toContain('<PaymentStatusBadge')
    expect(tracking).toContain('<OrderStatusBadge')
    expect(tracking).toContain('<PaymentStatusBadge')
    expect(wholesaleDashboard).toContain('<OrderStatusBadge')
    expect(wholesaleInvoices).toContain('<PaymentStatusBadge')
    expect(adminWholesale).toContain('<OrderStatusBadge')
  })

  it('keeps form errors identifiable by icon and text', () => {
    expect(register).toContain('<AlertCircle')
    expect(checkout).toContain('<AlertCircle')
    expect(wholesaleForm).toContain('<AlertCircle')
    for (const source of [register, checkout, wholesaleForm]) expect(source).toContain('role="alert"')
  })

  it('provides verified Kinyarwanda payment status labels', () => {
    for (const key of ['payment_status_paid', 'payment_status_pending', 'payment_status_failed', 'payment_status_refunded', 'payment_status_overdue']) {
      expect(kinyarwanda).toMatch(new RegExp(`${key}:.*// verified-rw`))
    }
  })
})
