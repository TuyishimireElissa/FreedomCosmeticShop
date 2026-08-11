/**
 * Checkout error surfaces on the WhatsApp path.
 *
 * The owner's screenshot showed TWO red banners stacked for one failure:
 *
 *   "Kimwe mu bicuruzwa wahisemo cyashize..."      (page banner, specific)
 *   "Ntitwashoboye kubika order yawe..."           (card, generic)
 *
 * Two separate defects in one picture.
 *
 * 1. Both surfaces rendered. checkout/page.tsx sets `checkoutError` from the
 *    API's reason, then WhatsAppCompleteOrder unconditionally added its own
 *    generic message on a null return. The second contradicted the first and
 *    told the customer to retry something that could not succeed.
 *
 * 2. The specific message was itself wrong. The API returned
 *    PRODUCT_UNAVAILABLE for an id that resolves to no product — a bundle, or
 *    a stale localStorage cart — and the client mapped that onto "out of
 *    stock", sending the customer to hunt for a stock problem that did not
 *    exist. Nothing in the catalogue is out of stock.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')

/** Comments stripped: these files document the bug they fixed in prose, and a
 *  naive substring check matches the explanation instead of the code. */
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '')

const page = code('src/app/checkout/page.tsx')
const card = code('src/components/checkout/WhatsAppCompleteOrder.tsx')
const rw = read('src/lib/i18n/translations/rw.ts')
const en = read('src/lib/i18n/translations/en.ts')

describe('one failure produces one message', () => {
  it('the card defers to a caller that reports its own errors', () => {
    expect(card).toContain('reportsOwnErrors')
    expect(card).toContain('if (!reportsOwnErrors) setError')
  })

  it('the checkout page declares that it does', () => {
    expect(page).toContain('<WhatsAppCompleteOrder onCreateOrder={createWhatsAppOrder} reportsOwnErrors />')
  })

  it('the card still speaks up on a thrown network error', () => {
    // The caller cannot describe a fetch that never returned, so this branch
    // must keep its generic message.
    const submit = card.slice(card.indexOf('async function submit'), card.indexOf('async function copyMessage'))
    expect(submit).toMatch(/catch\s*\{\s*setError\(t\('checkout\.wa_error'\)\)/)
  })
})

describe('the message matches the actual failure', () => {
  it('UNKNOWN_ITEM is not described as a stock problem', () => {
    expect(page).toContain("code === 'UNKNOWN_ITEM'")
    expect(page).toContain("t('checkout.wa_error_unknown_item')")

    // The mapping must not fall through to the stock wording.
    const mapper = page.slice(page.indexOf('const whatsAppOrderError'), page.indexOf('const createWhatsAppOrder'))
    const unknownLine = mapper.split('\n').find((line) => line.includes('UNKNOWN_ITEM'))
    expect(unknownLine).not.toContain('wa_error_stock')
  })

  it('the unknown-item copy tells the customer to remove the item', () => {
    // "no longer available" — not "out of stock", which is a different and in
    // this case untrue claim.
    expect(en).toContain('no longer available')
    expect(rw).toContain('ntikikiboneka')
  })

  it('keeps a phone-specific message ahead of the generic one', () => {
    const mapper = page.slice(page.indexOf('const whatsAppOrderError'), page.indexOf('const createWhatsAppOrder'))
    expect(mapper.indexOf('customerPhone')).toBeLessThan(mapper.indexOf("t('checkout.wa_error')"))
  })
})

describe('bundles fail with an explanation, not a stock lie', () => {
  it('are caught before the request is sent', () => {
    // The endpoint prices by productId against the Product table; a bundle id
    // resolves to nothing there. The paid path maps to { bundleId }; this one
    // never did.
    expect(page).toContain('items.filter((item) => item.isBundle)')
    expect(page).toContain("t('checkout.wa_error_bundle'")
  })

  it('names the offending items so the customer knows what to remove', () => {
    expect(page).toContain('bundleNames.join')
    expect(rw).toContain('{items}')
    expect(en).toContain('{items}')
  })

  it('the guard runs before the fetch, not after', () => {
    const fn = page.slice(page.indexOf('const createWhatsAppOrder'))
    expect(fn.indexOf('bundleNames')).toBeLessThan(fn.indexOf('await fetch'))
  })
})

describe('nothing on the bag or checkout blocks ordering on stock', () => {
  const cart = code('src/components/storefront/CartView.tsx')

  it('the WhatsApp button is never disabled by a stock condition', () => {
    // `disabled` exists on the component but the checkout page must not pass
    // it — the owner settles stock over WhatsApp, not by refusing the order.
    expect(page).not.toMatch(/<WhatsAppCompleteOrder[^>]*disabled=/)
  })

  it('the bag shows availability as information, not an error', () => {
    // Muted grey, not red. Present for transparency only.
    const line = cart.split('\n').find((l) => l.includes("t('cart.stock_available'"))
    expect(line).toBeTruthy()
    expect(line).toContain('text-gray-500')
    expect(line).not.toContain('text-red')
  })

  it('the bag never renders a blocking stock error', () => {
    expect(cart).not.toContain('INSUFFICIENT_STOCK')
  })
})

describe('both languages carry every new string', () => {
  it.each(['wa_error_unknown_item', 'wa_error_bundle'])('%s exists in rw and en', (key) => {
    expect(rw, `rw missing ${key}`).toContain(`${key}:`)
    expect(en, `en missing ${key}`).toContain(`${key}:`)
  })

  it('the Kinyarwanda is written, not copied from English', () => {
    expect(rw).toContain('Ibicuruzwa bifatanyije')
    expect(rw).toContain('igitebo') // bag = igitebo, never igare (bicycle)
    expect(rw).not.toContain('igare')
  })
})
