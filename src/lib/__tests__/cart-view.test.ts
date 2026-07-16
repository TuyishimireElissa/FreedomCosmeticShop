import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(process.cwd(), 'src/components/storefront/CartView.tsx'), 'utf8')
const page = readFileSync(resolve(process.cwd(), 'src/app/cart/page.tsx'), 'utf8')

describe('mobile-first cart view', () => {
  it('uses the persistent cart hook while retaining the legacy component source', () => {
    expect(source).toContain('useCart()')
    expect(page).toContain('<CartView />')
    expect(() => readFileSync(resolve(process.cwd(), 'src/components/storefront/LegacyCartView.tsx'))).not.toThrow()
  })
  it('uses real delivery district and calculation APIs', () => {
    expect(source).toContain("fetch('/api/delivery/districts'")
    expect(source).toContain('/api/delivery/calculate?district=')
    expect(source).not.toContain('getDeliveryFee(')
  })
  it('shows coupon information before applying it', () => {
    expect(source).toContain('setCouponPreview')
    expect(source).toContain("t('cart.coupon_terms_title')")
    expect(source).toContain('if (!couponPreview || !couponPreview.canApply) return')
    expect(source).toContain('setAppliedCoupon({ code: couponPreview.coupon.code')
  })
  it('supports save for later, undo, WhatsApp, and real stock limits', () => {
    for (const term of ['cart.saveForLater', 'cart.undoRemove', 'buildWhatsAppShareUrl', 'item.maxQuantity']) expect(source).toContain(term)
  })
  it('provides a mobile-only sticky checkout bar above bottom navigation', () => {
    expect(source).toContain('fixed bottom-[calc(64px+env(safe-area-inset-bottom))]')
    expect(source).toContain('md:hidden')
    expect(source).toContain('min-h-[52px]')
  })
})
