import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const button = readFileSync(resolve(process.cwd(), 'src/components/cart/CartWhatsAppOrder.tsx'), 'utf8')
const cart = readFileSync(resolve(process.cwd(), 'src/components/storefront/CartView.tsx'), 'utf8')
const en = readFileSync(resolve(process.cwd(), 'src/lib/i18n/translations/en.ts'), 'utf8')
const rw = readFileSync(resolve(process.cwd(), 'src/lib/i18n/translations/rw.ts'), 'utf8')

describe('cart WhatsApp assisted ordering', () => {
  it('is integrated below the real cart summary and checkout control', () => {
    expect(cart).toContain("import CartWhatsAppOrder from '@/components/cart/CartWhatsAppOrder'")
    expect(cart).toContain('<CartWhatsAppOrder items={cart.items} subtotal={cart.subtotal} discount={discount} district={cart.selectedDistrict} deliveryFee={delivery ? deliveryFee : null} />')
  })

  it('hands off to the path that persists the order before WhatsApp opens', () => {
    // This test previously asserted the cart built a wa.me message itself from
    // item name, quantity, price, links and totals. That flow produced an
    // order which existed only inside the customer's WhatsApp app: no FC-
    // reference, no row in /admin/whatsapp-orders, no stock movement, and lost
    // entirely if they closed the tab before sending.
    //
    // /api/orders/whatsapp saves first and recomputes every price server-side,
    // but requires a name, phone and district that the cart never collects.
    // The button therefore carries the shopper to checkout, which collects
    // exactly those and then posts to that endpoint. The guarantee worth
    // pinning is that the cart no longer mints an unsaved order.
    expect(button).toContain("router.push('/checkout')")
    expect(button).not.toContain('buildCartOrderMessage')
    expect(button).not.toContain('window.open')
    expect(button).toContain('Math.max(0, subtotal - discount + deliveryFee)')
  })

  it('requires a real district delivery result before opening WhatsApp', () => {
    expect(button).toContain('const ready = Boolean(district) && deliveryFee !== null')
    expect(button).toContain('disabled={!ready}')
    expect(button).toContain("t('whatsapp.select_district_first')")
  })

  it('sends PII-free analytics and does not block the hand-off', () => {
    // Ordering against window.open no longer applies — the button navigates
    // rather than opening a tab. What still matters is that the analytics
    // call carries no personal data and that it fires before navigation, so
    // the event is not lost to the route change.
    expect(button.indexOf("trackWhatsAppClick('order_cart'")).toBeLessThan(button.indexOf("router.push('/checkout')"))
    expect(button).not.toContain('customerName')
    expect(button).not.toContain('email')
    expect(button).not.toContain('sessionId')
  })

  it('uses mobile touch targets and translated labels', () => {
    expect(button).toContain('min-h-12')
    for (const key of ['cart_prefer', 'order_cart', 'items_included', 'select_district_first']) {
      expect(en).toMatch(new RegExp(`\\b${key}:`))
      expect(rw).toMatch(new RegExp(`\\b${key}:.*// verified-rw`))
    }
  })
})
