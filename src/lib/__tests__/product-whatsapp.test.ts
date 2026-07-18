import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const button = readFileSync(resolve(process.cwd(), 'src/components/products/OrderViaWhatsApp.tsx'), 'utf8')
const detail = readFileSync(resolve(process.cwd(), 'src/components/products/ProductDetailClient.tsx'), 'utf8')
const route = readFileSync(resolve(process.cwd(), 'src/app/products/[slug]/page.tsx'), 'utf8')
const en = readFileSync(resolve(process.cwd(), 'src/lib/i18n/translations/en.ts'), 'utf8')
const rw = readFileSync(resolve(process.cwd(), 'src/lib/i18n/translations/rw.ts'), 'utf8')

describe('product WhatsApp assisted ordering', () => {
  it('is integrated into the active database-backed product detail route', () => {
    expect(route).toContain('const { slug } = await params')
    expect(route).toContain('<ProductDetailClient slug={slug}')
    expect(detail).toContain("import OrderViaWhatsApp from '@/components/products/OrderViaWhatsApp'")
    expect(detail).toContain('<OrderViaWhatsApp product={{ id: product.id, name: product.name, slug: product.slug, price: product.price, stock: product.stock }}')
  })

  it('uses current product, selection, quantity and persisted district data', () => {
    expect(button).toContain('productName: product.name')
    expect(button).toContain('price: product.price')
    expect(button).toContain('quantity,')
    expect(button).toContain('shade: selectedShade || undefined')
    expect(button).toContain('size: selectedSize || undefined')
    expect(button).toContain('district: selectedDistrict || undefined')
    expect(button).toContain('totalRWF: total')
    expect(button).toContain('window.location.origin')
  })

  it('opens WhatsApp before non-blocking PII-free analytics', () => {
    expect(button.indexOf('window.open(whatsappUrl')).toBeLessThan(button.indexOf("trackWhatsAppClick('order_product'"))
    expect(button).not.toContain('productName: product.name,\n      productSlug')
    expect(button).not.toContain('sessionId')
    expect(button).not.toContain('userId')
  })

  it('is mobile-friendly and prevents orders for unavailable quantities', () => {
    expect(button).toContain("const disabled = product.stock < 1 || quantity < 1 || quantity > product.stock")
    expect(button).toContain('min-h-12')
    expect(button).toContain('h-11 w-11')
    expect(button).toContain('disabled={disabled}')
  })

  it('has matching translated labels', () => {
    for (const key of ['order_product', 'order_product_compact', 'order_includes', 'unavailable']) {
      expect(en).toMatch(new RegExp(`\\b${key}:`))
      expect(rw).toMatch(new RegExp(`\\b${key}:.*// verified-rw`))
    }
  })
})
