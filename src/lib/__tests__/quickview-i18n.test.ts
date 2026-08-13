/**
 * QuickView spoke English only.
 *
 * THE DEFECT. QuickView already imported `t()` and used it for some labels,
 * which is what made this easy to miss — it looked translated. But eleven
 * visible strings were hardcoded English on a site whose primary language is
 * Kinyarwanda:
 *
 *     Wholesale · Quantity · Total · Added! · View Full Details · Kigali:
 *     Saved / Wishlist · In stock · "N left in stock" · You save · per unit
 *     plus both zoom aria-labels
 *
 * This is the same class of bug as the ProductCard "Quick View" leak fixed in
 * c6d56d2. Finding it in the very next component suggests it is worth a
 * standing guard rather than a one-off fix, which is what this file is.
 *
 * WHY IT MATTERS HERE SPECIFICALLY. QuickView is the fast path — a shopper
 * taps it from the grid instead of opening the product page. Reaching an
 * English-only panel from a Kinyarwanda catalogue is exactly the moment a
 * low-literacy shopper abandons.
 *
 * WHAT IS DELIBERATELY LEFT IN ENGLISH. "WhatsApp" is a proper noun and is
 * spelled the same in every language, including in the existing rw.ts. It is
 * whitelisted below rather than silently ignored.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => {
  const raw = readFileSync(path, 'utf8')
  expect(raw.length, `${path} is empty`).toBeGreaterThan(200)
  return raw
}

/** Comments strip out: they legitimately contain English prose. */
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '')

const quickView = code('src/components/products/QuickView.tsx')
const trackOrder = code('src/components/storefront/TrackOrderView.tsx')
const enSource = read('src/lib/i18n/translations/en.ts')
const rwSource = read('src/lib/i18n/translations/rw.ts')

/** Brand names that are identical in every language. */
const PROPER_NOUNS = new Set(['WhatsApp', 'Kigali', 'RWF'])

/** Does `namespace.key` exist in the given translation file? */
function hasKey(source: string, namespace: string, key: string) {
  const block = new RegExp(`^  ${namespace}: \\{([\\s\\S]*?)^  \\},`, 'm').exec(source)
  if (!block) return false
  return new RegExp(`\\b${key}:`).test(block[1])
}

describe('QuickView renders no hardcoded English', () => {
  it('has no untranslated visible text node', () => {
    const nodes = [...quickView.matchAll(/>([A-Za-z][^<>{}]{2,60})</g)]
      .map((match) => match[1].trim())
      .filter(Boolean)
      .filter((text) => !PROPER_NOUNS.has(text))
    expect(nodes, `hardcoded text: ${nodes.join(' | ')}`).toEqual([])
  })

  it('has no untranslated literal in a ternary label', () => {
    // `{wishlisted ? 'Saved' : 'Wishlist'}` was one of these.
    const pairs = [...quickView.matchAll(/\?\s*'([A-Z][^']{2,40})'\s*:\s*'([A-Z][^']{2,40})'/g)]
      .map((match) => `${match[1]}/${match[2]}`)
      // HTTP verbs are not user-facing copy.
      .filter((pair) => pair !== 'DELETE/POST')
    expect(pairs, `hardcoded ternary: ${pairs.join(' | ')}`).toEqual([])
  })

  it('has no untranslated aria-label', () => {
    // A screen-reader user is just as entitled to Kinyarwanda.
    const labels = [...quickView.matchAll(/aria-label="([^"]+)"/g)].map((match) => match[1])
    expect(labels, `literal aria-label: ${labels.join(' | ')}`).toEqual([])
  })

  it('routes the stock line through translations', () => {
    expect(quickView).toContain("t('product.left_in_stock'")
    expect(quickView).toContain("t('common.in_stock')")
    expect(quickView).not.toContain('left in stock`')
  })

  it('routes the savings line through translations', () => {
    expect(quickView).toContain("t('product.you_save')")
    expect(quickView).toContain("t('product.per_unit')")
    expect(quickView).not.toContain("' per unit'")
  })

  it('translates both zoom states', () => {
    expect(quickView).toContain("t('product.zoom_out')")
    expect(quickView).toContain("t('product.zoom_in')")
  })
})

describe('order tracking speaks both languages', () => {
  // Found by the same sweep that found QuickView: the privacy hint under the
  // phone field was hardcoded English, on the one screen a worried customer
  // uses to find their order.
  it('translates the privacy hint', () => {
    expect(trackOrder).toContain("t('orders.track_privacy_hint')")
    expect(trackOrder).not.toContain('For privacy, enter the same phone number')
  })

  it('resolves that key in both languages', () => {
    expect(hasKey(enSource, 'orders', 'track_privacy_hint')).toBe(true)
    expect(hasKey(rwSource, 'orders', 'track_privacy_hint')).toBe(true)
  })
})

describe('every key QuickView calls actually exists', () => {
  // A missing key renders blank, which is worse than English. My first pass
  // referenced `delivery.kigali` and `product.saved`, and NEITHER EXISTED —
  // caught by resolving each key against the translation files before
  // shipping, not by reading the code.
  const referenced = [...quickView.matchAll(/t\('([a-z_]+)\.([a-z_]+)'/g)].map(
    (match) => [match[1], match[2]] as const,
  )

  it('references a non-trivial number of keys', () => {
    // Guards against the regex silently matching nothing.
    expect(referenced.length).toBeGreaterThan(8)
  })

  it.each([...new Set(referenced.map(([ns, key]) => `${ns}.${key}`))])(
    '%s resolves in both languages',
    (path) => {
      const [namespace, key] = path.split('.')
      expect(hasKey(enSource, namespace, key), `${path} missing from en`).toBe(true)
      expect(hasKey(rwSource, namespace, key), `${path} missing from rw`).toBe(true)
    },
  )
})

describe('the new Kinyarwanda is reviewed', () => {
  const added = ['zoom_in', 'zoom_out', 'left_in_stock', 'per_unit', 'view_full_details', 'saved', 'kigali_label']

  /**
   * Read the line from INSIDE the product namespace.
   *
   * A plain `lines.find(startsWith('saved:'))` returns the FIRST match in the
   * whole file, and `saved:` also exists under `settings`. Mutation testing
   * caught that: corrupting product.saved still passed, because the
   * assertion was reading the settings key. Scope the search to the block.
   */
  const productBlock = (() => {
    const match = /^  product: \{([\s\S]*?)^  \},/m.exec(rwSource)
    expect(match, 'product namespace not found in rw.ts').not.toBeNull()
    const body = match![1]
    expect(body.length, 'product block is empty').toBeGreaterThan(200)
    return body
  })()

  const lineFor = (key: string) =>
    productBlock.split('\n').find((candidate) => candidate.trim().startsWith(`${key}:`))

  it.each(added)('product.%s is marked verified-rw', (key) => {
    const line = lineFor(key)
    expect(line, `${key} not found in the product block of rw.ts`).toBeDefined()
    expect(line, `unreviewed rw: ${line?.trim()}`).toContain('verified-rw')
  })

  it.each(added)('product.%s never says igare, which means bicycle', (key) => {
    const line = lineFor(key)
    expect(line, `${key} not found`).toBeDefined()
    expect(line!, `igare in ${key}: ${line?.trim()}`).not.toMatch(/\bigare\b/i)
  })
})
