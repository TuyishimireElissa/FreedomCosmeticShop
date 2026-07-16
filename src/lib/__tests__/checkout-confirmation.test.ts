import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const view = read('src/components/checkout/ConfirmationView.tsx')
const checkout = read('src/app/checkout/page.tsx')
const cardReturn = read('src/app/checkout/payment-return/page.tsx')
const en = read('src/lib/i18n/translations/en.ts')
const rw = read('src/lib/i18n/translations/rw.ts')

describe('honest order confirmation view', () => {
  it('shows real order, payment, delivery and estimate data', () => {
    expect(view).toContain('/track`')
    for (const term of ['order.orderNumber', 'tracked?.paymentStatus', 'tracked?.paymentMethod', 'tracked?.estimatedArrival', 'tracked.deliveryFee', 'destination']) expect(view).toContain(term)
  })

  it('provides tracking, WhatsApp sharing, shopping and support actions', () => {
    expect(view).toContain('href="/track-order"')
    expect(view).toContain('buildWhatsAppShareUrl(message)')
    expect(view).toContain('href="/products"')
    expect(view).toContain('href="/contact"')
    expect(view).toContain('buildWhatsAppUrl(supportMessage)')
  })

  it('does not expose unconfigured business contact details or claim notifications were sent', () => {
    expect(view).toContain('const whatsappSupport = buildWhatsAppUrl(supportMessage)')
    expect(view).toContain("const hasPhone = !BUSINESS.phone.includes('TODO:')")
    expect(view).not.toContain('SMS sent')
    expect(view).not.toContain('Email sent')
    expect(en).toContain('SMS or email delivery depends on the configured notification service.')
  })

  it('uses the same confirmation view after checkout and Flutterwave return', () => {
    expect(checkout).toContain('<ConfirmationView order={completedOrder}')
    expect(cardReturn).toContain('<ConfirmationView order={{ ...result.order, items: [] }}')
  })

  it('has matching verified Kinyarwanda confirmation translations', () => {
    for (const key of ['order_number_label', 'payment_status', 'expected_delivery', 'track_order', 'share_whatsapp', 'continue_shopping', 'support_title']) {
      expect(en).toMatch(new RegExp(`\\b${key}:`))
      expect(rw).toMatch(new RegExp(`\\b${key}:.*// verified-rw`))
    }
  })
})
