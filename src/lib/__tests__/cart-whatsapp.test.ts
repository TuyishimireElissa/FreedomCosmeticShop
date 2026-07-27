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

  it('includes current cart lines, bundle/product links and exact totals', () => {
    for (const term of ['name: item.name', 'quantity: item.quantity', 'price: item.price', 'size: item.volume || undefined', 'subtotal,', 'discount,', 'district,', 'deliveryFee,', 'totalRWF: total']) expect(button).toContain(term)
    expect(button).toContain("item.isBundle ? `/bundles/")
    expect(button).toContain(": `/products/")
    expect(button).toContain('Math.max(0, subtotal - discount + deliveryFee)')
  })

  it('requires a real district delivery result before opening WhatsApp', () => {
    expect(button).toContain('const ready = Boolean(district) && deliveryFee !== null')
    expect(button).toContain('disabled={!ready}')
    expect(button).toContain("t('whatsapp.select_district_first')")
  })

  it('opens WhatsApp before sending non-blocking PII-free analytics', () => {
    expect(button.indexOf('window.open(whatsappUrl')).toBeLessThan(button.indexOf("trackWhatsAppClick('order_cart'"))
    expect(button).not.toContain('customerName')
    expect(button).not.toContain('phone')
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
