/**
 * The checkout phone format bug — every WhatsApp order failed.
 *
 * Reported by the owner: tapping "Ohereza order kuri WhatsApp" showed
 * "Ntitwashoboye kubika order yawe". Reproduced against live production:
 * POST /api/orders/whatsapp returned 400 INVALID_INPUT / customerPhone.
 *
 * ROOT CAUSE
 *
 * The checkout form stores the phone display-formatted. AddressForm runs
 * every keystroke through `formatRwandaPhone`, which produces
 * "+250 788 123 456" WITH SPACES, and checkout/page.tsx posted
 * `address.phone` verbatim. The route's regex was
 * /^(?:\+250|250|0)?7[2389]\d{7}$/ — no room for whitespace. So the only
 * order path in the shop rejected input its own form had just produced.
 *
 * WHY 1,108 TESTS MISSED IT
 *
 * Every existing test that touches customerPhone hard-codes the canonical
 * '+250788123456'. Not one used the string the UI actually generates. These
 * tests drive the real formatter's output through the real schema, so the
 * two halves can never silently disagree again.
 */

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { z } from 'zod'
import { formatRwandaPhoneDisplay, normalizeRwandaPhone } from '@/lib/phone'

/**
 * The route's phone field, mirrored.
 *
 * The route imports Prisma and cannot be loaded in this environment, so the
 * schema fragment is reproduced here — and a source assertion below pins that
 * the route still uses `normalizeRwandaPhone`, so this mirror cannot drift
 * into testing something the route no longer does.
 */
const customerPhone = z
  .string()
  .max(30)
  .transform((value, ctx) => {
    try {
      return normalizeRwandaPhone(value)
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'INVALID_PHONE' })
      return z.NEVER
    }
  })

describe('the API accepts exactly what the checkout form produces', () => {
  it('accepts the display format the form actually posts', () => {
    // This is the whole bug. formatRwandaPhoneDisplay is what AddressForm
    // runs on every keystroke; its output must survive the API.
    const asTyped = formatRwandaPhoneDisplay('0788123456')
    expect(asTyped).toBe('+250 788 123 456')

    const result = customerPhone.safeParse(asTyped)
    expect(result.success, `the form posts "${asTyped}" and the API rejected it`).toBe(true)
    expect(result.success && result.data).toBe('+250788123456')
  })

  it.each([
    ['0788123456', 'MTN, local'],
    ['0730123456', 'Airtel, local'],
    ['+250788123456', 'canonical'],
    ['250788123456', 'no plus'],
    ['+250 788 123 456', 'display format'],
    ['0788 123 456', 'local with spaces'],
    ['078-812-3456', 'dashes'],
    ['(0788) 123456', 'parentheses'],
  ])('accepts %s (%s)', (input) => {
    expect(customerPhone.safeParse(input).success).toBe(true)
  })

  it('normalises every accepted format to one stored value', () => {
    // Without this the database accumulates four spellings of one number and
    // "find this customer's orders" silently misses some.
    const stored = [
      '0788123456',
      '+250788123456',
      '250788123456',
      '+250 788 123 456',
      '0788 123 456',
    ].map((value) => {
      const parsed = customerPhone.safeParse(value)
      return parsed.success ? parsed.data : 'FAILED'
    })
    expect(new Set(stored).size, `got ${JSON.stringify(stored)}`).toBe(1)
    expect(stored[0]).toBe('+250788123456')
  })

  it.each([
    ['', 'empty'],
    ['12345', 'too short'],
    ['+250 788 123 45', 'one digit short'],
    ['+250 700 123 456', 'invalid mobile prefix 70'],
    ['+254788123456', 'Kenyan country code'],
    ['not a phone', 'letters'],
  ])('still rejects %s (%s)', (input) => {
    const result = customerPhone.safeParse(input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('INVALID_PHONE')
    }
  })

  it('rejects a very long string before doing any work', () => {
    expect(customerPhone.safeParse('0'.repeat(500)).success).toBe(false)
  })
})

describe('the route wires the normaliser in, not a bare regex', () => {
  const route = readFileSync('src/app/api/orders/whatsapp/route.ts', 'utf8')
  const code = route.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  it('imports and applies normalizeRwandaPhone', () => {
    expect(code).toContain("from '@/lib/phone'")
    expect(code).toContain('normalizeRwandaPhone(value)')
  })

  it('no longer pins the whitespace-hostile regex on customerPhone', () => {
    // Comments stripped first: the file documents the old pattern in prose.
    const phoneBlock = code.slice(code.indexOf('customerPhone'), code.indexOf('customerEmail'))
    expect(phoneBlock).not.toContain('7[2389]')
  })

  it('still reports the failure as INVALID_PHONE', () => {
    // The client maps this code onto a "check your phone number" message.
    expect(code).toContain("message: 'INVALID_PHONE'")
  })
})

describe('the customer is told what actually went wrong', () => {
  const page = readFileSync('src/app/checkout/page.tsx', 'utf8')
  const code = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  it('maps field-level issues onto specific advice', () => {
    expect(code).toContain('whatsAppOrderError')
    expect(code).toContain("badField === 'customerPhone'")
    expect(code).toContain("code === 'INSUFFICIENT_STOCK'")
    expect(code).toContain("code === 'RATE_LIMITED'")
  })

  it('sets the error instead of failing silently', () => {
    // The old code returned a bare null, so every cause produced the same
    // "try again" message — useless when retrying cannot help.
    expect(code).toMatch(/setCheckoutError\(whatsAppOrderError\(/)
  })

  it('clears a stale error once an order succeeds', () => {
    expect(code).toContain('setCheckoutError(null)')
  })

  it('has both translations for the new messages', () => {
    const rw = readFileSync('src/lib/i18n/translations/rw.ts', 'utf8')
    const en = readFileSync('src/lib/i18n/translations/en.ts', 'utf8')
    for (const key of ['wa_error_stock', 'wa_error_rate_limited']) {
      expect(rw, `rw missing ${key}`).toContain(`${key}:`)
      expect(en, `en missing ${key}`).toContain(`${key}:`)
    }
    // Kinyarwanda-first: the rw strings must be real translations, not
    // English copied across.
    expect(rw).toContain('Wagerageje kenshi cyane')
    expect(rw).toContain('cyashize')
  })
})
