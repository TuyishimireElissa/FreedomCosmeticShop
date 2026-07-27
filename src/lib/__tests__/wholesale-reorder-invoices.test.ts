import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getInvoicePaymentSummary } from '@/lib/wholesale-invoice'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const reorderApi = read('src/app/api/wholesale/reorder/route.ts')
const dashboard = read('src/components/wholesale/WholesaleDashboard.tsx')
const invoices = read('src/components/wholesale/WholesaleInvoices.tsx')
const service = read('src/server/services/wholesale.ts')
const paymentEvents = read('src/server/services/payment-events.ts')
const refundApi = read('src/app/api/payments/refund/route.ts')
const kinyarwanda = read('src/lib/i18n/translations/rw.ts')

describe('secure wholesale reorder flow', () => {
  it('requires an approved owner and records only owned wholesale reorder attempts', () => {
    expect(reorderApi).toContain("user.wholesaleStatus !== 'APPROVED'")
    expect(reorderApi).toContain("userId: user.id, orderType: 'WHOLESALE'")
    expect(reorderApi).toContain('db.wholesaleReorder.create')
    expect(reorderApi).toContain('originalOrderId: originalOrder.id')
  })

  it('uses current products, stock, and server-calculated pricing', () => {
    expect(reorderApi).toContain('calculateWholesalePrice(product.id, quantity, user.id)')
    expect(reorderApi).toContain('Math.min(originalItem.quantity, product.stock, 99)')
    expect(reorderApi).toContain('product.isDeleted')
    expect(reorderApi).not.toContain('stock: 999')
    expect(dashboard).toContain("fetch('/api/wholesale/reorder'")
    expect(dashboard).not.toContain('fetch(`/api/orders/${lastOrder.orderNumber}`)')
  })
})

describe('payment-derived wholesale invoices', () => {
  it('derives paid, pending, failed, refunded, and overdue states from payment records', () => {
    const now = new Date('2026-07-17T12:00:00Z')
    expect(getInvoicePaymentSummary([], 10_000, null, now).paymentStatus).toBe('PENDING')
    expect(getInvoicePaymentSummary([{ status: 'FAILED', amount: 10_000, method: 'MTN_MOMO', completedAt: null }], 10_000, null, now).paymentStatus).toBe('FAILED')
    expect(getInvoicePaymentSummary([{ status: 'PAID', amount: 10_000, method: 'MTN_MOMO', completedAt: now }], 10_000, null, now)).toMatchObject({ paymentStatus: 'PAID', isPaid: true, paidAmount: 10_000, balanceDue: 0 })
    expect(getInvoicePaymentSummary([{ status: 'REFUNDED', amount: 10_000, method: 'MTN_MOMO', completedAt: now }], 10_000, null, now)).toMatchObject({ paymentStatus: 'REFUNDED', isPaid: false, paidAmount: 0, balanceDue: 0 })
    expect(getInvoicePaymentSummary([], 10_000, new Date('2026-07-15T12:00:00Z'), now)).toMatchObject({ paymentStatus: 'OVERDUE', daysOverdue: 2 })
  })

  it('does not mark an unpaid non-credit order as paid and synchronizes verified payment/refund changes', () => {
    expect(service).toContain('const paidPayment = order.payments.find')
    expect(service).not.toContain('isPaid: !order.isCredit')
    expect(service).toContain('balanceDue: Math.max(0, order.total - paidAmount)')
    expect(paymentEvents).toContain('tx.wholesaleInvoice.updateMany')
    expect(paymentEvents).toContain('paidAmount: order.total')
    expect(refundApi).toContain('db.wholesaleInvoice.updateMany')
    expect(refundApi).toContain('balanceDue: 0')
  })

  it('does not print placeholder seller, payment, manager, or contact details', () => {
    expect(invoices).toContain('configured(BUSINESS.legalName)')
    expect(invoices).not.toContain('BUSINESS.invoice.momoPaymentNumber')
    expect(invoices).not.toContain('BUSINESS.phoneDisplay')
    expect(invoices).not.toContain('BUSINESS.emailInvoices')
    expect(dashboard).not.toContain('Jean Paul')
    expect(dashboard).not.toContain('250789000001')
    expect(invoices).toContain('WHOLESALE_CONFIG.contacts.map')
  })

  it('provides verified Kinyarwanda status and reorder copy', () => {
    for (const key of ['reorder_prepared', 'invoice_status_paid', 'invoice_status_pending', 'invoice_status_failed', 'invoice_status_refunded', 'invoice_status_overdue', 'invoice_not_tax_notice']) {
      expect(kinyarwanda).toMatch(new RegExp(`${key}:.*// verified-rw`))
    }
  })
})
