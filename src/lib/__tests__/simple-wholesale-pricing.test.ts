import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
const publicProduct = readFileSync('src/lib/public-product.ts', 'utf8')
const adminForm = readFileSync('src/components/admin/AdminProductManager.tsx', 'utf8')
const createApi = readFileSync('src/app/api/admin/products/route.ts', 'utf8')
const card = readFileSync('src/components/storefront/ProductCard.tsx', 'utf8')
const detail = readFileSync('src/components/products/ProductDetailClient.tsx', 'utf8')
const checkout = readFileSync('src/app/checkout/page.tsx', 'utf8')
const products = readFileSync('src/components/products/ProductsPageClient.tsx', 'utf8')

describe('simple Rwanda wholesale pricing', () => {
  it('stores an admin-entered integer RWF wholesale price', () => {
    expect(schema).toContain('wholesalePrice Int?')
    expect(publicProduct).toContain('wholesalePrice: true')
    expect(createApi).toContain('wholesalePrice: data.wholesalePrice ?? null')
    expect(adminForm).toContain('Wholesale Price (RWF)')
  })

  it('shows approved wholesale pricing while retaining the shared Add to Cart button', () => {
    expect(card).toContain("user?.wholesaleStatus === 'APPROVED'")
    expect(card).toContain('price: displayPrice')
    expect(card).toContain('retailPrice: product.price')
    expect(card).toContain('You save {formatRWF(savings)}')
    expect(card).toContain("t('product.add_to_cart')")
  })

  it('adds product-detail quantities at the active wholesale or retail price', () => {
    expect(detail).toContain('Wholesale pricing')
    expect(detail).toContain('Math.min(12')
    expect(detail).toContain('price: displayPrice')
    expect(detail).toContain('formatRWF(displayPrice * quantity)')
  })

  it('disables online checkout for approved wholesale customers', () => {
    expect(checkout).toContain("user?.wholesaleStatus === 'APPROVED'")
    expect(checkout).toContain('Wholesale orders use WhatsApp')
  })

  it('shows an honest wholesale banner in the catalogue', () => {
    expect(products).toContain('You are viewing wholesale prices')
    expect(products).toContain('All wholesale orders go through WhatsApp')
  })
})
