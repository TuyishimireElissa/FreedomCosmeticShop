/**
 * The shop must never advertise a payment method it cannot process.
 *
 * `payments.enabled` is false: PayPack has no credentials and its KYC needs
 * RDB registration the owner has deferred. A customer who picks a card cannot
 * complete an order, so any card claim on a customer-facing surface is a
 * promise the shop cannot keep.
 *
 * This was not hypothetical. Three separate surfaces advertised
 * Visa/Mastercard simultaneously — the homepage trust card, the footer badge
 * row on EVERY page, and the schema.org `paymentAccepted` property that tells
 * Google what the shop accepts. Fixing the first did nothing about the other
 * two. This test exists so the next person cannot reintroduce any of them.
 *
 * Scope note: dormant integration code (PaymentSelector, PAYMENT_METHODS.CARD,
 * the Flutterwave service) is deliberately NOT covered. It is feature-flagged
 * off, renders nowhere, and must survive for the day cards are enabled. What
 * is policed here is only what a customer or a crawler can actually read.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ACCEPTED_PAYMENTS, ACCEPTED_PAYMENTS_SCHEMA } from '@/lib/accepted-payments'
import { SEO_CONFIG } from '@/lib/seo-config'
import { getLocalBusinessSchema } from '@/lib/structured-data'

const read = (path: string) => readFileSync(path, 'utf8')

/** Card brands and phrases that imply a working card checkout. */
const CARD_CLAIMS = [/\bvisa\b/i, /\bmastercard\b/i, /\bmaster card\b/i, /\bamex\b/i, /\bcredit card\b/i, /\bdebit card\b/i]

/** Pull a single translation value out of a translations module by key. */
function value(source: string, key: string): string {
  return source.match(new RegExp(`\\n\\s*${key}: ['"](.*?)['"],`))?.[1] ?? ''
}

describe('accepted payment methods are the single source of truth', () => {
  it('lists only methods that work today', () => {
    expect([...ACCEPTED_PAYMENTS]).toEqual(['MTN MoMo', 'Airtel Money', 'Cash on Delivery'])
    expect([...ACCEPTED_PAYMENTS_SCHEMA]).toEqual(['MTN Mobile Money', 'Airtel Money', 'Cash on Delivery'])
  })

  it('contains no card brand', () => {
    for (const entry of [...ACCEPTED_PAYMENTS, ...ACCEPTED_PAYMENTS_SCHEMA]) {
      for (const claim of CARD_CLAIMS) expect(entry, entry).not.toMatch(claim)
    }
  })
})

describe('no customer-facing surface advertises card payment', () => {
  it('the footer badge row reads from the shared list', () => {
    const footer = read('src/components/layout/Footer.tsx')
    expect(footer).toContain('ACCEPTED_PAYMENTS')
    // The literal array that shipped Visa/Mastercard on every page.
    expect(footer).not.toMatch(/'Visa'/)
    expect(footer).not.toMatch(/'Mastercard'/)
  })

  it('schema.org tells Google only what the shop can process', () => {
    const accepted = SEO_CONFIG.localBusiness.paymentAccepted.join(', ')
    for (const claim of CARD_CLAIMS) expect(accepted, accepted).not.toMatch(claim)

    // Assert the rendered schema, not just the config that feeds it.
    const schema = getLocalBusinessSchema() as Record<string, unknown>
    const payment = String(schema.paymentAccepted ?? '')
    expect(payment).toContain('MTN Mobile Money')
    expect(payment).toContain('Cash on Delivery')
    for (const claim of CARD_CLAIMS) expect(payment, payment).not.toMatch(claim)
  })

  it('the payment FAQ makes no card claim in either language', () => {
    for (const path of ['src/lib/i18n/translations/en.ts', 'src/lib/i18n/translations/rw.ts']) {
      const answer = value(read(path), 'faq_payment_a')
      expect(answer, path).not.toBe('')
      for (const claim of CARD_CLAIMS) expect(answer, `${path}: ${answer}`).not.toMatch(claim)
      // `ikarita` is Kinyarwanda for card.
      expect(answer.toLowerCase(), path).not.toContain('ikarita')
    }
  })

  it('the FAQ promises no future card support', () => {
    // Same rule as "confirmed shortly": no claim without something to back it.
    // PayPack is blocked on RDB registration with no date.
    for (const path of ['src/lib/i18n/translations/en.ts', 'src/lib/i18n/translations/rw.ts']) {
      const answer = value(read(path), 'faq_payment_a').toLowerCase()
      for (const promise of ['coming soon', 'biraza vuba', 'vuba aha', 'shortly']) {
        expect(answer, `${path} promises: ${promise}`).not.toContain(promise)
      }
    }
  })

  it('the homepage trust card and how-to-order stay card-free', () => {
    const en = read('src/lib/i18n/translations/en.ts')
    const rw = read('src/lib/i18n/translations/rw.ts')
    for (const key of ['trust_payment_providers', 'how_step3_body']) {
      for (const source of [en, rw]) {
        const text = value(source, key)
        expect(text, key).not.toBe('')
        for (const claim of CARD_CLAIMS) expect(text, `${key}: ${text}`).not.toMatch(claim)
      }
    }
  })
})

describe('the disabled card integration is preserved, not deleted', () => {
  it('keeps the feature-flagged payment code in place', () => {
    // Removing these would be irreversible and the owner has ruled that the
    // PayPack/Flutterwave path must survive behind its flag.
    expect(read('src/lib/format.ts')).toContain('CARD:')
    expect(() => read('src/components/checkout/PaymentSelector.tsx')).not.toThrow()
    expect(() => read('src/server/services/flutterwave.ts')).not.toThrow()
  })

  it('does not render the card selector while payments are disabled', () => {
    const checkout = read('src/app/checkout/page.tsx')
    expect(checkout).not.toMatch(/<PaymentSelector[\s/>]/)
  })
})
