/**
 * Phase 4b-3 — WhatsApp Orders dashboard.
 *
 * Covers the three things that can silently go wrong:
 *   1. the copy-message formatter (customer-facing text, mutation-tested)
 *   2. the list endpoint's filtering, which must never leak non-WhatsApp orders
 *   3. the UI's status buttons, which must match the server's transition table
 *      exactly — offering a move the API rejects with 409 is a dead button
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildFollowUpMessage } from '@/lib/whatsapp/buildFollowUpMessage'
import { normalizeWhatsAppNumber } from '@/lib/whatsapp/buildOrderMessage'
import { timeAgo } from '@/lib/whatsapp/relativeTime'

const read = (path: string) => readFileSync(path, 'utf8')

const baseOrder = {
  orderNumber: 'FC-20260809-1234',
  customerName: 'Uwase Claudine',
  address: 'Near Amahoro Stadium',
  district: 'Gasabo',
  sector: 'Remera',
  items: [
    { name: 'Freedom Glow Serum', quantity: 2, price: 12000 },
    { name: 'Shea Body Lotion', quantity: 1, price: 5500 },
  ],
  total: 30500,
}

describe('copy order message', () => {
  it('includes every fact the customer needs', () => {
    const message = buildFollowUpMessage(baseOrder)
    for (const fragment of [
      'Uwase Claudine', 'FC-20260809-1234', 'Freedom Glow Serum', 'x2',
      'Shea Body Lotion', 'Gasabo', 'Remera', 'Freedom Cosmetic Shop',
    ]) {
      expect(message).toContain(fragment)
    }
  })

  it('multiplies unit price by quantity rather than printing the unit price', () => {
    const message = buildFollowUpMessage(baseOrder)
    expect(message).toContain('RWF 24,000') // 12000 x 2
    expect(message).toContain('RWF 5,500')
    expect(message).toContain('RWF 30,500')
  })

  it('makes no promise about response or delivery time', () => {
    const message = buildFollowUpMessage(baseOrder).toLowerCase()
    // The standing rule: no time claims without an SLA to back them.
    for (const claim of ['shortly', 'immediately', 'within', 'minutes', 'hours', 'soon', 'fast', 'quick']) {
      expect(message).not.toContain(claim)
    }
    expect(message).toContain('we will contact you to confirm delivery')
  })

  it('reads the shop number from config instead of hard-coding it', () => {
    const source = read('src/lib/whatsapp/buildFollowUpMessage.ts')
    expect(source).toContain('BUSINESS.whatsapp')
    expect(source).not.toContain('+250790215965')
    expect(buildFollowUpMessage(baseOrder)).toContain('+250790215965')
  })

  it('never leaks an owner placeholder to a customer', () => {
    expect(buildFollowUpMessage(baseOrder)).not.toContain('TODO')
    expect(read('src/lib/whatsapp/buildFollowUpMessage.ts')).toContain("includes('TODO')")
  })

  it('omits the delivery line entirely when no address is known', () => {
    const message = buildFollowUpMessage({ ...baseOrder, address: null, district: null, sector: null })
    expect(message).not.toContain('*Delivery:*')
    expect(message).not.toContain('undefined')
    expect(message).not.toContain('null')
  })

  it('renders Kinyarwanda when asked', () => {
    const message = buildFollowUpMessage({ ...baseOrder, language: 'rw' })
    expect(message).toContain('Muraho Uwase Claudine')
    expect(message).toContain('Tuzabahamagara')
    expect(message).not.toContain('Hello')
  })

  it('handles a single item and an empty item list without breaking', () => {
    expect(buildFollowUpMessage({ ...baseOrder, items: [baseOrder.items[0]] })).toContain('x2')
    const empty = buildFollowUpMessage({ ...baseOrder, items: [] })
    expect(empty).toContain('FC-20260809-1234')
    expect(empty).toContain('RWF 30,500')
  })
})

describe('customer WhatsApp links', () => {
  it.each([
    ['+250788123456', '250788123456'],
    ['250788123456', '250788123456'],
    ['0788123456', '250788123456'],
    ['788123456', '250788123456'],
    ['+250 788 123 456', '250788123456'],
  ])('normalises %s to %s', (input, expected) => {
    expect(normalizeWhatsAppNumber(input)).toBe(expected)
  })

  it('builds wa.me links through the helper, never by string-prefixing 250', () => {
    const view = read('src/components/admin/WhatsAppOrdersView.tsx')
    expect(view).toContain('normalizeWhatsAppNumber(order.customerPhone)')
    // `wa.me/250${phone}` would produce wa.me/250+250788... for stored E.164.
    expect(view).not.toMatch(/wa\.me\/250\$\{/)
  })
})

describe('list endpoint scoping', () => {
  const route = read('src/app/api/admin/whatsapp-orders/route.ts')

  it('only ever returns WhatsApp orders', () => {
    // The 6 legacy card/COD orders must never appear on this dashboard.
    expect(route).toContain('whatsappSentAt: { not: null }')
    expect(route).toContain('requirePermission(PERMISSIONS.ORDERS_READ)')
  })

  it('keeps the WhatsApp scope on the counts and the empty-state probe too', () => {
    // A count that ignored the scope would show "12 orders" over an empty table.
    expect(route.match(/whatsappSentAt: \{ not: null \}/g)?.length).toBeGreaterThanOrEqual(3)
  })

  it('treats payment state as separate from order status', () => {
    expect(route).toContain("payments: { some: { status: 'PAID' } }")
    expect(route).toContain("payments: { none: { status: 'PAID' } }")
    // PAID must not be offered as an order status.
    expect(route).not.toMatch(/STATUSES = \[[^\]]*'PAID'/)
  })

  it('includes RETURNED so those orders stay reachable', () => {
    expect(route).toContain("'RETURNED'")
  })

  it('rejects an unknown status instead of silently ignoring it', () => {
    expect(route).toContain('INVALID_STATUS')
  })

  it('never caches customer data', () => {
    expect(route).toContain("'Cache-Control': 'private, no-store, max-age=0'")
  })
})

describe('status buttons match the server transition table', () => {
  const view = read('src/components/admin/WhatsAppOrdersView.tsx')
  const server = read('src/app/api/orders/[id]/route.ts')

  const parse = (source: string, marker: string) => {
    const start = source.indexOf(marker)
    const body = source.slice(start, source.indexOf('}', source.indexOf('RETURNED:', start)))
    const table: Record<string, string[]> = {}
    for (const line of body.split('\n')) {
      const match = line.match(/^\s*([A-Z_]+):\s*\[(.*)\]/)
      if (match) table[match[1]] = match[2].split(',').map((v) => v.trim().replace(/'/g, '')).filter(Boolean)
    }
    return table
  }

  it('offers exactly the transitions the API accepts, for every status it shows', () => {
    const ui = parse(view, 'const NEXT_STATUS')
    const api = parse(server, 'const ALLOWED_STATUS_TRANSITIONS')

    // The API also knows PENDING, which belongs to legacy card/COD orders that
    // this WhatsApp-only dashboard never lists. Every status the UI *does*
    // show must match the server exactly — a button the API rejects with 409
    // is a dead button.
    expect(Object.keys(ui)).not.toContain('PENDING')
    for (const status of Object.keys(ui)) {
      expect(api[status], `server has no rule for ${status}`).toBeDefined()
      expect(ui[status], `UI/API disagree on ${status}`).toEqual(api[status])
    }
    // And every status reachable from a WhatsApp order must be represented.
    for (const status of ['PENDING_WHATSAPP', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED']) {
      expect(Object.keys(ui)).toContain(status)
    }
  })

  it('mutations reuse the guarded endpoints rather than writing directly', () => {
    expect(view).toContain('/api/orders/${current.id}')
    expect(view).toContain('/record-payment')
    expect(view).not.toContain('prisma')
  })
})

describe('empty state and accessibility', () => {
  const view = read('src/components/admin/WhatsAppOrdersView.tsx')

  it('distinguishes "no orders yet" from "no search matches"', () => {
    expect(view).toContain('orders_empty_title')
    expect(view).toContain('orders_nomatch_title')
    expect(view).toContain('filtersActive')
  })

  it('does not offer to seed fake orders into the production database', () => {
    expect(view.toLowerCase()).not.toContain('create test order')
    expect(view).not.toContain('TEST ORDER')
  })

  it('announces errors assertively and keeps tap targets at 44px', () => {
    expect(view).toContain('aria-live="assertive"')
    expect(view).toContain('role="alert"')
    expect(view).toContain('min-h-11')
  })

  it('respects reduced motion wherever it animates', () => {
    const animated = view.match(/animate-spin/g)?.length ?? 0
    expect(animated).toBeGreaterThan(0)
    expect(view.match(/motion-reduce:animate-none/g)?.length).toBe(animated)
  })

  it('uses fcs tokens and never the banned rose', () => {
    expect(view).toContain('fcs-brand-strong')
    expect(view).not.toContain('#C77B85')
    expect(view).not.toMatch(/\bum-[a-z]/)
  })
})

describe('relative time', () => {
  const t = (key: string, vars?: Record<string, string | number>) =>
    vars ? `${key}:${vars.count}` : key

  const now = new Date('2026-08-09T12:00:00Z').getTime()
  it.each([
    ['2026-08-09T11:59:40Z', 'whatsapp.time_just_now'],
    ['2026-08-09T11:45:00Z', 'whatsapp.time_minutes:15'],
    ['2026-08-09T09:00:00Z', 'whatsapp.time_hours:3'],
    ['2026-08-07T12:00:00Z', 'whatsapp.time_days:2'],
  ])('renders %s as %s', (iso, expected) => {
    expect(timeAgo(iso, t, now)).toBe(expected)
  })

  it('uses keys that actually exist in both languages', () => {
    const en = read('src/lib/i18n/translations/en.ts')
    const rw = read('src/lib/i18n/translations/rw.ts')
    for (const key of ['time_just_now', 'time_minutes', 'time_hours', 'time_days']) {
      expect(en).toContain(`${key}:`)
      expect(rw).toContain(`${key}:`)
    }
  })
})

describe('translations', () => {
  const en = read('src/lib/i18n/translations/en.ts')
  const rw = read('src/lib/i18n/translations/rw.ts')
  const view = read('src/components/admin/WhatsAppOrdersView.tsx')

  it('defines every whatsapp.* key the view references, in both languages', () => {
    const keys = [...view.matchAll(/t\('whatsapp\.([a-z_A-Z]+)'/g)].map((match) => match[1])
    expect(keys.length).toBeGreaterThan(20)
    for (const key of new Set(keys)) {
      expect(en, `en missing ${key}`).toContain(`${key}:`)
      expect(rw, `rw missing ${key}`).toContain(`${key}:`)
    }
  })

  it('marks the Kinyarwanda strings as reviewed', () => {
    const block = rw.slice(rw.indexOf('admin_orders:'), rw.indexOf('action_failed:'))
    const lines = block.split('\n').filter((line) => line.trim() && line.includes(':'))
    for (const line of lines) expect(line, line.trim()).toContain('verified-rw')
  })
})

describe('sidebar entry', () => {
  const sidebar = read('src/components/admin/AdminSidebar.tsx')

  it('navigates by href and keys on it, avoiding the duplicate-key bug', () => {
    expect(sidebar).toContain("href: '/admin/whatsapp-orders'")
    expect(sidebar).toContain('key={item.href || item.tab}')
  })

  it('produces a unique key for every nav item', () => {
    const keys = sidebar
      .split('\n')
      .filter((line) => line.includes('tab:') && line.includes('icon:'))
      .map((line) => line.match(/href: '([^']+)'/)?.[1] ?? line.match(/tab: '([a-z-]+)'/)?.[1])
    expect(keys.length).toBeGreaterThan(10)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('does not add an AdminTab value that AdminView cannot render', () => {
    // An unmatched tab would render a blank legacy dashboard.
    expect(read('src/components/admin/AdminShellContext.tsx')).not.toContain("'whatsapp-orders'")
  })
})

describe('timeline endpoint', () => {
  const route = read('src/app/api/admin/orders/[id]/timeline/route.ts')

  it('is read-only and permission guarded', () => {
    expect(route).toContain('requirePermission(PERMISSIONS.ORDERS_READ)')
    for (const write of ['.update(', '.create(', '.delete(']) {
      expect(route.replace('activityLog.findMany', '')).not.toContain(`order${write}`)
    }
  })

  it('builds history only from real timestamps, inventing nothing', () => {
    expect(route).toContain('hasAuditTrail')
    // Every entry is guarded on a real, non-null timestamp; nothing is
    // synthesised when a column is empty.
    expect(route).toContain('if (at) entries.push')
    // Strip comments before asserting on code — the file legitimately explains
    // in prose that no date is *estimated*.
    const code = route.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    expect(code).not.toMatch(/Date\.now\(\)|new Date\(\)/)
  })

  it('bounds the activity query', () => {
    expect(route).toContain('take: 100')
  })
})
