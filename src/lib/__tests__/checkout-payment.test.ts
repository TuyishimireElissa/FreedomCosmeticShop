import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const selector = read('src/components/checkout/PaymentSelector.tsx')
const momo = read('src/components/checkout/MoMoPayment.tsx')
const waiting = read('src/components/checkout/MoMoWaiting.tsx')
const checkout = read('src/app/checkout/page.tsx')
const momoApi = read('src/app/api/payments/momo/route.ts')
const cardApi = read('src/app/api/payments/card/route.ts')
const stock = read('src/server/services/payment-order-validation.ts')

describe('honest mobile-first checkout payment flow', () => {
  it('keeps MTN first and shows the COD Kigali restriction upfront', () => {
    expect(selector.indexOf("method === 'MTN_MOMO'")).toBeLessThan(selector.indexOf("method === 'AIRTEL_MONEY'"))
    expect(selector).toContain("!isKigali &&")
    expect(selector).toContain("t('checkout.cod_kigali_warning')")
    expect(selector).toContain('min-h-[72px]')
  })

  it('shows exact amount, merchant and charged phone without collecting a PIN', () => {
    for (const term of ["t('checkout.amount_to_approve')", "t('checkout.charging_phone')", 'BUSINESS.name', "t('checkout.pin_on_phone')"]) expect(momo).toContain(term)
    expect(momo).toContain('normalizeRwandaPhone(phone)')
    expect(momo).not.toMatch(/type=["'](?:password|number)["'][^>]*(?:pin|PIN)/)
    expect(momo).not.toContain('onPin')
  })

  it('provides a five-minute waiting view and honest timeout recovery', () => {
    expect(waiting).toContain("status === 'timeout'")
    expect(waiting).toContain("t('checkout.payment_timeout_safe_help')")
    expect(waiting).toContain("t('checkout.retry_payment')")
    expect(waiting).toContain("t('checkout.get_whatsapp_help')")
    expect(waiting).not.toContain('No money was charged')
    expect(checkout).toContain('remaining={polling.remaining}')
    expect(checkout).toContain('if (pendingOrder) { await initiatePayment(pendingOrder); return }')
  })

  it('validates network and stock server-side before PayPack or Flutterwave initiation', () => {
    expect(momoApi).toContain("network !== 'MTN' && network !== 'AIRTEL'")
    expect(momoApi).toContain('isValidForNetwork(phone, network)')
    expect(momoApi).toContain('validateOrderStockForPayment(order.id)')
    expect(cardApi).toContain('validateOrderStockForPayment(order.id)')
    expect(stock).toContain('item.bundle.products')
    expect(stock).toContain('item.stock < item.quantity')
  })

  it('does not log the phone being charged', () => {
    expect(momoApi).not.toContain('from ${normalizedPhone}')
    expect(momoApi).not.toContain('console.log(normalizedPhone')
  })
})
