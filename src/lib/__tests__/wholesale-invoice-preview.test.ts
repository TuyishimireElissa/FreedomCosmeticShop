import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const page = readFileSync('src/app/wholesale/order-preview/page.tsx', 'utf8')
const cta = readFileSync('src/components/cart/WholesaleCartOrderButton.tsx', 'utf8')

describe('professional wholesale invoice preview', () => {
  it('uses the existing custom auth and cart architecture', () => {
    expect(page).toContain("useStore((state) => state.user)")
    expect(page).toContain('useCart()')
    expect(page).toContain("user?.wholesaleStatus === 'APPROVED'")
    expect(page).not.toContain('next-auth')
    expect(page).not.toContain('useSession')
  })

  it('shows bill-to, delivery, item table, and complete totals', () => {
    for (const text of ['Bill To', 'Deliver To', 'Item', 'Qty', 'Price', 'Subtotal', 'Delivery fee', 'TOTAL']) expect(page).toContain(text)
    expect(page).toContain('item.price * item.quantity')
    expect(page).toContain('subtotal + deliveryFee')
  })

  it('uses real delivery APIs rather than a hardcoded fee map', () => {
    expect(page).toContain("fetch('/api/delivery/districts'")
    expect(page).toContain('/api/delivery/calculate?district=')
    expect(page).not.toContain('getDeliveryFee(')
  })

  it('supports image sharing, PNG download, and print-to-PDF', () => {
    expect(page).toContain('toBlob(invoiceRef.current')
    expect(page).toContain('navigator.canShare?.({ files: [file] })')
    expect(page).toContain('toPng(invoiceRef.current')
    expect(page).toContain('Download Invoice PNG')
    expect(page).toContain('window.print()')
    expect(page).toContain('Print / Save PDF')
  })

  it('routes both wholesale cart CTAs to the preview and opens owner-confirmed WhatsApp', () => {
    expect(cta).toContain('href="/wholesale/order-preview"')
    expect(page).toContain('wholesaleWhatsAppNumber(user?.assignedManagerWhatsApp)')
    expect(page).toContain('FreedomCosmeticShop — Wholesale Order')
    expect(page).toContain('Please confirm this order.')
  })
})
