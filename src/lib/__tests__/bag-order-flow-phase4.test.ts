/**
 * Warm Brutalism — Phase 4, bag and order flow.
 *
 * The audit found /cart and /track-order already substantial: CartView has an
 * order summary, delivery estimator, undo-remove, save-for-later and
 * cross-sells; TrackOrderView is 472 lines with a working status timeline,
 * rider details and live updates. The brief's /bag and /orders/[id] routes do
 * not exist, and creating them would have meant redirects plus duplicating a
 * token-protected tracking flow, so both pages were improved in place.
 *
 * The important find was not cosmetic: the cart's WhatsApp button opened a
 * wa.me link built entirely client-side and persisted nothing.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')

const cartWa = read('src/components/cart/CartWhatsAppOrder.tsx')
const cartView = read('src/components/storefront/CartView.tsx')
const swipe = read('src/components/storefront/SwipeToDelete.tsx')
const track = read('src/components/storefront/TrackOrderView.tsx')
const en = read('src/lib/i18n/translations/en.ts')
const rw = read('src/lib/i18n/translations/rw.ts')

const value = (source: string, key: string) =>
  source.match(new RegExp(`\\n\\s*${key}: ['"](.*?)['"],`))?.[1] ?? ''

describe('cart WhatsApp order reaches the saving path', () => {
  it('no longer opens wa.me directly from cart state', () => {
    // The old flow produced an order that existed only in the customer's
    // WhatsApp app: no FC- reference, no admin row, no stock movement, and
    // gone entirely if they closed the tab without sending.
    expect(cartWa).not.toContain('window.open')
    expect(cartWa).not.toContain('buildCartOrderMessage')
    expect(cartWa).not.toContain('buildWhatsAppUrl')
  })

  it('routes to checkout, which collects the fields the endpoint requires', () => {
    // /api/orders/whatsapp requires customerName, customerPhone, province,
    // district and sector. The cart collects none of them.
    expect(cartWa).toContain("router.push('/checkout')")
  })

  it('still records the WhatsApp intent for analytics', () => {
    expect(cartWa).toContain("trackWhatsAppClick('order_cart'")
  })

  it('leaves the server-saving endpoint as the only order-creating path', () => {
    const endpoint = read('src/app/api/orders/whatsapp/route.ts')
    expect(endpoint).toContain("status: 'PENDING_WHATSAPP'")
    expect(endpoint).toContain('whatsappSentAt')
  })
})

describe('swipe to delete', () => {
  it('is applied to cart rows', () => {
    expect(cartView).toContain('<SwipeToDelete')
    expect(cartView).toContain('deleteLabel')
  })

  it('never becomes the only way to remove an item', () => {
    // The visible trash control must survive for keyboard, screen-reader and
    // desktop users.
    expect(cartView).toContain('onRemove')
    expect(read('src/components/storefront/CartView.tsx')).toContain('Trash2')
  })

  it('requires a second explicit tap rather than deleting on swipe', () => {
    // A single swipe that deletes is destructive with no confirmation.
    expect(swipe).toContain('setOpen(dx < 0)')
    expect(swipe).toContain('onClick={() => { setOpen(false); onDelete() }}')
  })

  it('ignores vertical drags so the page still scrolls', () => {
    expect(swipe).toContain('Math.abs(dy) > Math.abs(dx)')
  })

  it('keeps the hidden control out of the tab order until revealed', () => {
    expect(swipe).toContain('tabIndex={open ? 0 : -1}')
    expect(swipe).toContain('aria-hidden={!open}')
  })

  it('closes on Escape', () => {
    expect(swipe).toContain("event.key === 'Escape'")
  })

  it('respects reduced motion', () => {
    expect(swipe).toContain('motion-reduce:transition-none')
  })

  it('uses the urgent token rather than a raw red', () => {
    expect(swipe).toContain('bg-fcs-urgent')
    expect(swipe).not.toMatch(/#[0-9A-Fa-f]{6}/)
  })
})

describe('track order', () => {
  it('offers a question CTA with the reference pre-filled', () => {
    // Without the reference the customer must retype FC-20260809-1234.
    expect(track).toContain('ask_question_message')
    expect(value(en, 'ask_question_message')).toContain('{order}')
    expect(value(rw, 'ask_question_message')).toContain('{order}')
  })

  it('builds the link through the config helper, never a hard-coded wa.me', () => {
    expect(track).toContain('getWhatsAppLink')
    expect(track).not.toMatch(/https:\/\/wa\.me\//)
  })

  it('uses the AA-safe pill fill', () => {
    // --fcs-whatsapp is 1.98:1 with white and must not back a white-text CTA.
    expect(track).toContain('bg-fcs-whatsapp-pill')
  })

  it('keeps the existing share action and timeline', () => {
    expect(track).toContain('handleShare')
    expect(track).toContain('orders.timeline')
  })
})

describe('translations', () => {
  it('defines the new keys in both languages', () => {
    for (const key of ['ask_question', 'ask_question_message']) {
      expect(value(en, key), `en ${key}`).not.toBe('')
      expect(value(rw, key), `rw ${key}`).not.toBe('')
    }
  })

  it('marks the Kinyarwanda as reviewed', () => {
    for (const key of ['ask_question', 'ask_question_message']) {
      const line = rw.split('\n').find((row) => row.trim().startsWith(`${key}:`))
      expect(line, key).toContain('verified-rw')
    }
  })

  it('uses igitebo vocabulary, never igare, for the bag', () => {
    // `igare` means bicycle. The repo uses `igitebo` throughout.
    expect(value(rw, 'ask_question')).not.toMatch(/\bigare\b/i)
  })
})
