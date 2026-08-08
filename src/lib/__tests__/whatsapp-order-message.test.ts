import { describe, expect, it } from 'vitest'
import {
  buildWhatsAppOrderMessage,
  formatOrderReference,
  normalizeWhatsAppNumber,
  type WhatsAppOrderData,
} from '@/lib/whatsapp/buildOrderMessage'

const base: WhatsAppOrderData = {
  orderReference: 'FC-20260808-4821',
  customer: { name: 'Uwase Claudine', phone: '+250788123456', email: 'uwase@example.rw' },
  delivery: {
    province: 'Kigali City', district: 'Gasabo', sector: 'Remera',
    cell: 'Rukiri I', village: 'Amajyambere', landmark: 'Near Amahoro Stadium',
    notes: 'Call before arriving',
  },
  items: [
    { name: 'Freedom Glow Serum', variant: '50 ml', quantity: 2, unitPrice: 12000, subtotal: 24000 },
  ],
  pricing: { subtotal: 24000, deliveryFee: 1000, discount: 2400, couponCode: 'FREEDOM10', total: 22600 },
  timestamp: new Date('2026-08-08T09:30:00Z'),
  language: 'rw',
}

describe('WhatsApp order message', () => {
  it('includes every critical order fact in Kinyarwanda', () => {
    const m = buildWhatsAppOrderMessage(base)
    for (const fragment of [
      'FC-20260808-4821', 'Freedom Glow Serum', '50 ml', 'Uwase Claudine',
      '+250788123456', 'Gasabo', 'Remera', 'Rukiri I', 'Amajyambere',
      'FREEDOM10', 'IGITERANYO CYOSE',
    ]) expect(m).toContain(fragment)
  })

  it('switches language without losing any data', () => {
    const en = buildWhatsAppOrderMessage({ ...base, language: 'en' })
    expect(en).toContain('NEW ORDER')
    expect(en).toContain('GRAND TOTAL')
    expect(en).not.toContain('IGITERANYO')
    expect(en).toContain('FC-20260808-4821')
  })

  it('omits optional fields rather than printing blanks', () => {
    const sparse = buildWhatsAppOrderMessage({
      ...base,
      customer: { name: 'Mukamana', phone: '+250788000111' },
      delivery: { province: 'Southern', district: 'Huye', sector: 'Ngoma' },
      pricing: { subtotal: 5000, deliveryFee: 3000, total: 8000 },
    })
    expect(sparse).not.toMatch(/Icyerekezo:\s*$/m)
    expect(sparse).not.toContain('Imeyili:')
    expect(sparse).not.toContain('Igabanyirizwa')
    expect(sparse).toContain('Huye')
  })

  it('shows the discount only when one was applied', () => {
    expect(buildWhatsAppOrderMessage(base)).toContain('Igabanyirizwa')
    const none = buildWhatsAppOrderMessage({ ...base, pricing: { ...base.pricing, discount: 0, couponCode: null } })
    expect(none).not.toContain('Igabanyirizwa')
  })

  it('lists every line item', () => {
    const m = buildWhatsAppOrderMessage({
      ...base,
      items: [
        base.items[0]!,
        { name: 'Shea Butter', variant: null, quantity: 1, unitPrice: 5000, subtotal: 5000 },
      ],
    })
    expect(m).toContain('1. *Freedom Glow Serum*')
    expect(m).toContain('2. *Shea Butter*')
  })

  it('formats the reference as FC-YYYYMMDD-XXXX', () => {
    expect(formatOrderReference(new Date('2026-08-08T00:00:00Z'), '4821')).toBe('FC-20260808-4821')
    expect(formatOrderReference(new Date('2026-01-05T00:00:00Z'), '0007')).toBe('FC-20260105-0007')
  })

  it('normalises Rwandan numbers for wa.me', () => {
    for (const input of ['+250790215965', '250790215965', '0790215965', '790215965']) {
      expect(normalizeWhatsAppNumber(input)).toBe('250790215965')
    }
  })

  it('survives URL encoding without losing line breaks or emoji', () => {
    const encoded = encodeURIComponent(buildWhatsAppOrderMessage(base))
    expect(decodeURIComponent(encoded)).toContain('🌸')
    expect(decodeURIComponent(encoded).split('\n').length).toBeGreaterThan(20)
  })
})
