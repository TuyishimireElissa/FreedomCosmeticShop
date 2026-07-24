import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildWholesaleCartOrderMessage, buildWholesaleCartWhatsAppOrder } from '@/lib/wholesale-whatsapp'

const read = (path: string) => readFileSync(path, 'utf8')

const items = [
  { name: 'Nivea Lotion 400ml', volume: '400ml', price: 6800, quantity: 12 },
  { name: 'Vitamin C Serum', volume: '30ml', price: 11250, quantity: 6 },
  { name: 'Shampoo', volume: '500ml', price: 6120, quantity: 24 },
]

describe('approved wholesale cart ordering', () => {
  it('builds the exact English multi-item WhatsApp order format and total', () => {
    expect(buildWholesaleCartOrderMessage({ items, language: 'en' })).toBe([
      'Hello FreedomCosmeticShop,',
      '',
      'I want to order the following items:',
      '',
      '1. *Nivea Lotion 400ml* (400ml) x 12 - RWF 81,600',
      '2. *Vitamin C Serum* (30ml) x 6 - RWF 67,500',
      '3. *Shampoo* (500ml) x 24 - RWF 146,880',
      '',
      '*Subtotal: RWF 295,980*',
      '*Grand Total: RWF 295,980*',
      '',
      'Please arrange delivery to my location.',
    ].join('\n'))
  })

  it('builds the Kinyarwanda cart order and uses an owner-confirmed number', () => {
    const message = buildWholesaleCartOrderMessage({ items, language: 'rw' })
    expect(message).toContain('Muraho FreedomCosmeticShop,')
    expect(message).toContain('Nshaka gutuma ibi bicuruzwa:')
    expect(message).toContain('*Igiteranyo: RWF 295,980*')
    expect(message).toContain('*Igiteranyo Cyose: RWF 295,980*')
    expect(message).toContain('Nyamuneka munyoherereze.')
    expect(decodeURIComponent(buildWholesaleCartWhatsAppOrder({ items, language: 'rw' }))).toContain('wa.me/250790215965')
  })

  it('uses the same Add to Cart interaction with wholesale unit and retail reference prices', () => {
    const card = read('src/components/storefront/ProductCard.tsx')
    const detail = read('src/components/products/ProductDetailClient.tsx')
    expect(card).toContain('price: displayPrice')
    expect(card).toContain('retailPrice: product.price')
    expect(card).toContain("t('product.add_to_cart')")
    expect(card).not.toContain('Order via WhatsApp</a>')
    expect(detail).toContain('price: displayPrice')
    expect(detail).toContain('retailPrice: product.price')
  })

  it('routes wholesale checkout through the invoice preview while retaining retail checkout', () => {
    const cart = read('src/components/storefront/CartView.tsx')
    const drawer = read('src/components/storefront/CartDrawer.tsx')
    const wholesaleCta = read('src/components/cart/WholesaleCartOrderButton.tsx')
    for (const source of [cart, drawer]) {
      expect(source).toContain("user?.wholesaleStatus === 'APPROVED'")
      expect(source).toContain('WholesaleCartOrderButton')
    }
    expect(cart).toContain('href="/checkout"')
    expect(wholesaleCta).toContain('href="/wholesale/order-preview"')
    expect(wholesaleCta).toContain('Order via WhatsApp')
  })

  it('enforces authoritative wholesale prices in server cart APIs', () => {
    for (const path of ['src/app/api/cart/route.ts', 'src/app/api/cart/add/route.ts', 'src/app/api/cart/sync/route.ts']) {
      const source = read(path)
      expect(source).toContain("user.wholesaleStatus === 'APPROVED'")
      expect(source).toContain('wholesalePrice')
    }
  })
})
