/**
 * "Cart" → "Bag" in the English UI.
 *
 * Internal state keeps the word cart — `useStore.addToCart`, `cartCount`, the
 * `/cart` route, the `cart.*` translation namespace. Renaming those would be a
 * state and routing refactor with no user-visible benefit and real regression
 * risk, so only the strings a customer reads were changed.
 *
 * Kinyarwanda was already correct and is untouched: it says `igitebo`
 * (basket), used in 56 places. The brief twice proposed `igare`, which means
 * bicycle — this file makes that impossible to reintroduce.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const en = readFileSync('src/lib/i18n/translations/en.ts', 'utf8')
const rw = readFileSync('src/lib/i18n/translations/rw.ts', 'utf8')

const value = (source: string, key: string) =>
  source.match(new RegExp(`\\n\\s*${key}: ['"](.*?)['"],`))?.[1] ?? ''

/**
 * Read a key from inside one namespace. Plain `value()` finds the first match
 * in the file, and `title:` exists in a dozen namespaces — it was resolving to
 * `personalized_recommendations.title` rather than `cart.title`.
 */
function scoped(source: string, namespace: string, key: string): string {
  const start = source.indexOf(`\n  ${namespace}: {`)
  if (start === -1) return ''
  const end = source.indexOf('\n  },', start)
  return value(source.slice(start, end), key)
}

describe('English UI says Bag', () => {
  it('names the bag page "My Bag"', () => {
    expect(scoped(en, 'cart', 'title')).toBe('My Bag')
  })

  it.each([
    ['add_to_cart', 'Add to Bag'],
    ['back_to_cart', 'Back to bag'],
  ])('%s reads "%s"', (key, expected) => {
    expect(value(en, key)).toBe(expected)
  })

  it('says the bag is empty, not the cart', () => {
    expect(en).toContain("cart: 'Your bag is empty'")
  })

  it('renames the strings a shopper reads while ordering', () => {
    for (const key of ['cart_prefer', 'order_cart', 'items_included', 'cart_order_intro', 'floating_cart']) {
      const text = value(en, key)
      expect(text, `${key} is empty`).not.toBe('')
      expect(text.toLowerCase(), `${key}: ${text}`).not.toContain('cart')
    }
  })

  it('renames live-region announcements', () => {
    // These are read aloud by a screen reader on every add and remove.
    for (const key of ['cart_added', 'cart_removed', 'cart_restored', 'cart_cleared', 'cart_moved_from_saved']) {
      expect(value(en, key).toLowerCase(), key).not.toContain('cart')
      expect(value(en, key).toLowerCase(), key).toContain('bag')
    }
  })

  it('leaves internal and legal copy alone', () => {
    // Admin analytics labels and cookie-consent wording are not shopper UI;
    // rewriting the legal text would be a content change, not a rename.
    expect(value(en, 'analytics_event_order_cart')).toBe('Cart order')
    expect(value(en, 'abandoned_cart_label')).toBe('Abandoned Cart')
    expect(en).toContain('accounts, carts, security, and checkout')
  })
})

describe('Kinyarwanda keeps igitebo and never igare', () => {
  it('still uses igitebo for the bag', () => {
    expect(scoped(rw, 'cart', 'title')).toContain('gitebo')
    expect((rw.match(/gitebo/gi) ?? []).length).toBeGreaterThan(40)
  })

  it('contains no occurrence of igare anywhere', () => {
    // `igare` is a bicycle. It was proposed twice as the feature name.
    const matches = rw.match(/\bigare\b/gi) ?? []
    expect(matches, `found: ${matches.join(', ')}`).toEqual([])
  })
})

describe('state and routing were not refactored', () => {
  it('keeps the cart store API intact', () => {
    const store = readFileSync('src/store/useStore.ts', 'utf8')
    // Assert the interface declaration specifically, not merely that the word
    // appears somewhere — the file mentions addToCart several times, so a
    // partial rename of the declaration would slip past a bare `toContain`.
    for (const symbol of ['addToCart', 'removeFromCart', 'cartCount']) {
      expect(store, `${symbol} declaration`).toMatch(new RegExp(`\\n\\s*${symbol}: \\(`))
    }
    // And no bag-named counterpart was introduced alongside them.
    expect(store).not.toMatch(/\n\s*addToBag: \(/)
  })

  it('keeps the /cart route so existing links and history still resolve', () => {
    expect(() => readFileSync('src/app/cart/page.tsx', 'utf8')).not.toThrow()
  })
})
