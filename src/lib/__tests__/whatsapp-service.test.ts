import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  QUICK_REPLIES,
  WA_CONFIG,
  buildCartOrderMessage,
  buildProductOrderMessage,
  buildWhatsAppUrl,
} from '@/lib/whatsapp-service'

const source = readFileSync(resolve(process.cwd(), 'src/lib/whatsapp-service.ts'), 'utf8')
const en = readFileSync(resolve(process.cwd(), 'src/lib/i18n/translations/en.ts'), 'utf8')
const rw = readFileSync(resolve(process.cwd(), 'src/lib/i18n/translations/rw.ts'), 'utf8')

describe('honest WhatsApp assisted-selling messages', () => {
  it('uses the owner-confirmed number without inventing staff or response hours', () => {
    expect(WA_CONFIG.number).toBe('250780000000')
    expect(WA_CONFIG.agentName).toBeNull()
    expect(WA_CONFIG.responseHours.weekdays).toBeNull()
    expect(WA_CONFIG.responseHours.responseTime).toBeNull()
    expect(WA_CONFIG.isSupportProfileComplete).toBe(false)
  })

  it('builds a Kinyarwanda-default product message from exact real inputs', () => {
    const message = buildProductOrderMessage({
      productName: 'Real Product', productNameRw: 'Igicuruzwa Nyacyo',
      productUrl: 'https://freedom-cosmetic-shop.vercel.app/products/real-product',
      price: 12000, quantity: 2, shade: 'Deep', size: '200ml', district: 'Gasabo', totalRWF: 24000,
    })
    expect(message).toContain('Igicuruzwa Nyacyo')
    expect(message).toContain('RWF 24,000')
    expect(message).toContain('Deep')
    expect(message).toContain('200ml')
    expect(message).toContain('Gasabo')
    expect(() => buildProductOrderMessage({ productName: 'Real', productUrl: 'https://example.com/products/real', price: 12000, quantity: 2, totalRWF: 20000 })).toThrow('does not match')
  })

  it('validates cart arithmetic, URLs, discounts and delivery before messaging', () => {
    const base = {
      items: [{ name: 'Product', quantity: 2, price: 5000, productUrl: 'https://freedom-cosmetic-shop.vercel.app/products/product' }],
      subtotal: 10000, discount: 1000, deliveryFee: 1000, totalRWF: 10000,
      district: 'Kicukiro', storeUrl: 'https://freedom-cosmetic-shop.vercel.app', language: 'en' as const,
    }
    expect(buildCartOrderMessage(base)).toContain('RWF 10,000')
    expect(() => buildCartOrderMessage({ ...base, subtotal: 9000 })).toThrow('subtotal does not match')
    expect(() => buildCartOrderMessage({ ...base, totalRWF: 11000 })).toThrow('total does not match')
  })

  it('builds encoded mobile URLs and keeps quick replies accurate when hours are missing', () => {
    expect(buildWhatsAppUrl('Muraho!')).toContain('https://wa.me/250780000000?text=Muraho!')
    expect(QUICK_REPLIES.hours.en).toContain('have not yet been published')
    expect(QUICK_REPLIES.authenticity.en).toContain('only when verification is recorded')
    expect(QUICK_REPLIES.payment.en).toContain('PIN only on your own phone')
  })

  it('tracks no names, phone, email, user ID, or session identifier', () => {
    expect(source).not.toContain('productName?:')
    expect(source).not.toContain('sessionId?:')
    expect(source).not.toContain('userId?:')
    expect(source).not.toContain('phone?:')
    expect(source).not.toContain('email?:')
    expect(source).toContain("pagePath?.split('?')[0].split('#')[0]")
  })

  it('has matching verified Kinyarwanda message translations', () => {
    for (const key of ['message_greeting', 'product_order_intro', 'message_total', 'cart_order_intro', 'quick_payment', 'quick_delivery', 'quick_returns', 'quick_authenticity', 'quick_hours_unconfigured']) {
      expect(en).toMatch(new RegExp(`\\b${key}:`))
      expect(rw).toMatch(new RegExp(`\\b${key}:.*// verified-rw`))
    }
  })
})
