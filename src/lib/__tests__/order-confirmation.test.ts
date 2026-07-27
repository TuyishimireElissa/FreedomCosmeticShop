import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const service = read('src/server/services/order-confirmation.ts')
const createOrder = read('src/app/api/orders/create/route.ts')
const paymentEvents = read('src/server/services/payment-events.ts')
const checkout = read('src/app/checkout/page.tsx')
const form = read('src/components/checkout/AddressForm.tsx')
const confirmation = read('src/components/checkout/ConfirmationView.tsx')
const en = read('src/lib/i18n/translations/en.ts')
const rw = read('src/lib/i18n/translations/rw.ts')

describe('real and honest order confirmations', () => {
  it('uses configured SMS and Resend services without internal HTTP or fake contact values', () => {
    expect(service).toContain('sendSms(data.customerPhone')
    expect(service).toContain('sendEmail({')
    expect(service).toContain('if (features.sms)')
    expect(service).toContain('if (data.customerEmail && features.email)')
    expect(service).not.toContain('/api/internal/')
    expect(service).not.toContain('+250780000000')
  })

  it('sends COD confirmation only after the order transaction completes', () => {
    expect(createOrder.indexOf('const order = await prisma.$transaction')).toBeLessThan(createOrder.indexOf("input.paymentMethod === 'COD'\n      ? await sendOrderConfirmation"))
    expect(createOrder).toContain("language: z.enum(['en', 'rw']).default('rw')")
    expect(createOrder).toContain('confirmationDelivery')
  })

  it('sends paid confirmation only after the atomic idempotency gate', () => {
    expect(paymentEvents.indexOf('if (!processed) return')).toBeLessThan(paymentEvents.indexOf('await sendOrderConfirmation({'))
    expect(paymentEvents).toContain('paymentConfirmed: true')
    expect(paymentEvents).not.toContain('sendOrderConfirmationEmail(')
  })

  it('supports optional customer email without collecting payment credentials', () => {
    expect(form).toContain("type=\"email\"")
    expect(checkout).toContain('customerEmail: address.email.trim() || undefined')
    expect(checkout).toContain('language,')
    expect(checkout).toContain('address: `${address.village}')
    expect(form).not.toContain('type="password"')
  })

  it('reports provider acceptance and failure honestly in both languages', () => {
    expect(confirmation).toContain("confirmationDelivery?.sms === 'sent'")
    expect(confirmation).toContain("confirmationDelivery?.email === 'sent'")
    for (const key of ['sms_provider_accepted', 'sms_send_failed', 'email_provider_accepted', 'email_send_failed', 'email_not_configured']) {
      expect(en).toMatch(new RegExp(`\\b${key}:`))
      expect(rw).toMatch(new RegExp(`\\b${key}:.*// verified-rw`))
    }
  })
})
