import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const iconButton = read('src/components/a11y/IconButton.tsx')
const cart = read('src/components/storefront/CartView.tsx')
const cartDrawer = read('src/components/storefront/CartDrawer.tsx')
const search = read('src/components/storefront/SearchWithSuggestions.tsx')
const productCard = read('src/components/ui/ProductCard.tsx')
const productDetail = read('src/components/products/ProductDetailClient.tsx')
const wishlist = read('src/app/account/wishlist/page.tsx')
const products = read('src/app/products/page.tsx')
const quiz = read('src/components/quiz/RoutineQuiz.tsx')
const wholesaleDashboard = read('src/components/wholesale/WholesaleDashboard.tsx')
const wholesaleInvoices = read('src/components/wholesale/WholesaleInvoices.tsx')
const dialog = read('src/components/ui/dialog.tsx')
const sheet = read('src/components/ui/sheet.tsx')
const english = read('src/lib/i18n/translations/en.ts')
const kinyarwanda = read('src/lib/i18n/translations/rw.ts')

describe('accessible icon actions', () => {
  it('requires a programmatic name and hides decorative icon content', () => {
    expect(iconButton).toContain('label: string')
    expect(iconButton).toContain('aria-label={label}')
    expect(iconButton).toContain('title={title || label}')
    expect(iconButton).toContain('<span aria-hidden="true">{icon}</span>')
    expect(iconButton).toContain("sm: 'h-11 w-11")
    expect(iconButton).toContain("lg: 'h-12 w-12")
  })

  it('migrates cart remove and quantity icon actions with product-specific names', () => {
    expect(cart.match(/<IconButton/g)?.length).toBeGreaterThanOrEqual(5)
    expect(cart).toContain("t('product.decrease_quantity')")
    expect(cart).toContain("t('product.increase_quantity')")
    expect(cart).toContain("t('cart.remove_coupon')")
    expect(cartDrawer.match(/<IconButton/g)?.length).toBeGreaterThanOrEqual(3)
    expect(cartDrawer).toContain("t('cart.remove_product', { product: item.name })")
  })

  it('migrates search, wishlist, product, pagination, quiz, and wholesale icon actions', () => {
    expect(search).toContain("<IconButton label={t('common.clear')}")
    expect(productCard).toContain('<IconButton')
    expect(productCard).toContain('aria-pressed={isWishlisted}')
    expect(productDetail.match(/<IconButton/g)?.length).toBeGreaterThanOrEqual(3)
    expect(wishlist).toContain('<IconButton')
    expect(products.match(/<IconButton/g)?.length).toBe(2)
    expect(quiz).toContain('<IconButton')
    expect(wholesaleDashboard).toContain('<IconButton')
    expect(wholesaleInvoices).toContain('<IconButton')
  })

  it('gives shared modal close controls translated names and 44px targets', () => {
    for (const source of [dialog, sheet]) {
      expect(source).toContain("t('accessibility.close')")
      expect(source).toContain('aria-label=')
      expect(source).toContain('h-11 w-11')
      expect(source).not.toContain('<span className="sr-only">Close</span>')
    }
  })

  it('provides translated common icon-action names', () => {
    for (const key of ['close', 'go_back', 'remove_item']) {
      expect(english).toMatch(new RegExp(`${key}:`))
      expect(kinyarwanda).toMatch(new RegExp(`${key}:.*// verified-rw`))
    }
  })
})
