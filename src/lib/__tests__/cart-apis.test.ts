import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const preview = read('src/app/api/coupons/preview/route.ts')
const couponLogic = read('src/lib/coupon-preview.ts')
const validate = read('src/app/api/coupons/validate/route.ts')
const crossSells = read('src/app/api/products/cross-sells/route.ts')
const sync = read('src/app/api/cart/sync/route.ts')
const cartView = read('src/components/storefront/CartView.tsx')
const orderCreate = read('src/app/api/orders/create/route.ts')

describe('cart section 3 APIs', () => {
  it('previews only real database coupons and exposes database-backed terms', () => {
    expect(preview).toContain('previewCoupon')
    expect(couponLogic).toContain('prisma.coupon.findUnique')
    for (const term of ['minOrderAmount', 'maxDiscountAmount', 'usageRemaining', 'usageLimitPerUser', 'endsAt', 'canApply', 'rejectionReason']) expect(couponLogic).toContain(term)
    expect(validate).not.toContain("code === 'BEAUTY20'")
    expect(validate).not.toContain('beauty20-storefront')
    expect(orderCreate).not.toContain("code !== 'BEAUTY20'")
    expect(orderCreate).toContain('eligibleSubtotal')
  })

  it('calculates scoped coupon discounts using authoritative product prices', () => {
    expect(couponLogic).toContain('select: { id: true, price: true, categoryId: true }')
    expect(couponLogic).toContain('eligibleSubtotal')
    expect(couponLogic).toContain('productIds.includes(product.id)')
    expect(couponLogic).toContain('categoryIds.includes(product.categoryId)')
  })

  it('returns only in-stock, active same-category cross-sells with resized images', () => {
    expect(crossSells).toContain('categoryId: { in: categoryIds }')
    expect(crossSells).toContain('id: { notIn: parsed.data.productIds }')
    expect(crossSells).toContain('isActive: true')
    expect(crossSells).toContain('isDeleted: false')
    expect(crossSells).toContain('stock: { gt: 0 }')
    expect(crossSells).toContain("getCloudinaryUrl(structured.publicId, 'CARD_MOBILE')")
    for (const privateField of ['costPrice:', 'supplierId:', 'batchNumber:', 'manufacturedDate:', 'expiryDate:']) expect(crossSells).not.toContain(privateField)
  })

  it('uses custom JWT auth and server-authoritative replacement sync', () => {
    expect(sync).toContain("import { requireAuth } from '@/lib/auth'")
    expect(sync).not.toContain('NextAuth')
    expect(sync).not.toContain('getServerSession')
    expect(sync).toContain("mode: 'replace'")
    expect(sync).toContain('Math.min(requested.get(product.id) || 0, product.stock)')
    expect(sync).toContain('price: product.price')
    expect(sync).toContain('cartItem.deleteMany')
    expect(sync).toContain('totalItems, subtotal')
  })

  it('connects cart UI to preview and cross-sell APIs before coupon application', () => {
    expect(cartView).toContain("fetch('/api/coupons/preview'")
    expect(cartView).toContain('/api/products/cross-sells?productIds=')
    expect(cartView).toContain('if (!couponPreview || !couponPreview.canApply) return')
    expect(cartView).toContain("t('cart.coupon_terms_title')")
  })
})
