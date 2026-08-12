/**
 * Itemised stock shortfall when confirming a WhatsApp order.
 *
 * A gap I created. Removing the stock gate from /api/orders/whatsapp was
 * right — the owner accepts the order first and settles availability over
 * WhatsApp afterwards — but it moved the failure to confirm time without
 * giving the admin anything to act on.
 *
 * The confirm route already returns every short line:
 *
 *   409 { code: 'INSUFFICIENT_STOCK',
 *         items: [{ productId, name, needed, available }] }
 *
 * WhatsAppOrdersView threw all of it away and rendered one generic English
 * sentence. On the live 44-line order that means "action failed" and no clue
 * which item is the problem.
 *
 * Verified against the live database: temporarily starved one product below
 * what order FC-20260811-9699 needs, confirmed the shortfall computation
 * fires, then restored the stock.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')

/** Comments stripped: the file explains the old behaviour in prose. */
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '')

const view = code('src/components/admin/WhatsAppOrdersView.tsx')
const route = code('src/app/api/orders/[id]/route.ts')
const rw = read('src/lib/i18n/translations/rw.ts')
const en = read('src/lib/i18n/translations/en.ts')

describe('the confirm route still reports which lines are short', () => {
  it('returns a machine-readable code and the offending items', () => {
    // The UI contract. If this shape changes the panel silently stops working.
    expect(route).toContain("code: 'INSUFFICIENT_STOCK'")
    expect(route).toContain('items: stockError.items')
  })

  it('names each line with what is needed and what is available', () => {
    expect(route).toContain('needed: needed.quantity')
    expect(route).toContain('available: product?.stock ?? 0')
  })
})

describe('the admin sees which products are short, not just "failed"', () => {
  it('captures the itemised payload instead of discarding it', () => {
    expect(view).toContain("body.code === 'INSUFFICIENT_STOCK'")
    expect(view).toContain('setShortfall(body.items)')
  })

  it('only treats it as a shortfall when items actually arrived', () => {
    // A 409 with an empty array must fall through to the generic message
    // rather than render an empty panel.
    expect(view).toContain('Array.isArray(body.items) && body.items.length > 0')
  })

  it('does not also show the generic error for the same failure', () => {
    // Two contradictory messages for one cause is the bug already fixed on
    // the checkout page; do not reintroduce it here.
    expect(view).toMatch(/setShortfall\(body\.items\)\s*\n\s*setActionError\(null\)/)
  })

  it('still shows the generic message for every other failure', () => {
    expect(view).toContain("setActionError(body.error || t('whatsapp.action_failed'))")
  })

  it('clears a stale shortfall once a status change succeeds', () => {
    expect(view).toMatch(/setShortfall\(null\)\s*\n\s*setCurrent/)
  })

  it('renders one row per short product', () => {
    expect(view).toContain('shortfall.map((line)')
    expect(view).toContain('key={line.productId}')
    expect(view).toContain("t('whatsapp.stock_short_line', { needed: line.needed, available: line.available })")
  })

  it('announces itself to assistive technology', () => {
    expect(view).toContain('role="alert"')
  })

  it('tells the owner what to do next', () => {
    // A shortfall with no next step is just a dead end. Restock, or agree a
    // new quantity with the customer on WhatsApp.
    expect(view).toContain("t('whatsapp.stock_short_hint')")
  })

  it('uses fcs tokens, not raw hex', () => {
    const panel = view.slice(view.indexOf('{shortfall && ('), view.indexOf('{actionError && ('))
    expect(panel).toContain('border-fcs-border-subtle')
    expect(panel).toContain('text-fcs-urgent')
    expect(panel).not.toMatch(/#[0-9a-fA-F]{6}/)
  })
})

describe('the shortfall copy is bilingual and verified', () => {
  const KEYS = ['stock_short_title', 'stock_short_line', 'stock_short_hint']

  it.each(KEYS)('%s exists in both languages', (key) => {
    expect(rw, `rw missing ${key}`).toContain(`${key}:`)
    expect(en, `en missing ${key}`).toContain(`${key}:`)
  })

  it.each(KEYS)('%s carries a verified-rw marker', (key) => {
    const line = rw.split('\n').find((row) => row.trim().startsWith(`${key}:`))
    expect(line, `${key} missing from rw`).toBeTruthy()
    expect(line, `${key} unverified`).toContain('verified-rw')
  })

  it('keeps both interpolation placeholders in both languages', () => {
    for (const source of [rw, en]) {
      const line = source.split('\n').find((row) => row.trim().startsWith('stock_short_line:'))
      expect(line).toContain('{needed}')
      expect(line).toContain('{available}')
    }
  })

  it('the Kinyarwanda is written, not English copied across', () => {
    expect(rw).toContain('Ntibishoboka kwemeza')
    expect(rw).toContain('Bisabwa')
  })
})
