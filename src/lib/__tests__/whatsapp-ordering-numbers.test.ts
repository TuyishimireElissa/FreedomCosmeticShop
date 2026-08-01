import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BUSINESS,
  WHATSAPP_ORDERING_NUMBERS,
  formatWhatsAppDisplay,
  getWhatsAppLink,
  isPlaceholder,
} from '@/lib/business-config'

/**
 * The owner-confirmed ordering lines. Production previously published
 * `+250780000000` — a placeholder sitting in NEXT_PUBLIC_WHATSAPP — which meant
 * every "order on WhatsApp" button opened a chat with a number nobody owns.
 */
const PRIMARY = '+250790215965'
const SECONDARY = '+250785361796'

describe('WhatsApp ordering numbers', () => {
  it('publishes both owner-confirmed numbers, primary first', () => {
    expect(WHATSAPP_ORDERING_NUMBERS).toEqual([PRIMARY, SECONDARY])
  })

  it('treats the primary number as the default business contact', () => {
    expect(BUSINESS.whatsapp).toBe(PRIMARY)
    expect(BUSINESS.whatsappAlt).toBe(SECONDARY)
    expect(isPlaceholder(BUSINESS.whatsapp)).toBe(false)
  })

  it('accepts both as valid Rwandan mobile numbers', () => {
    // Same shape the WhatsApp button and WA_CONFIG validate against.
    for (const number of WHATSAPP_ORDERING_NUMBERS) {
      expect(number.replace(/\D/g, '')).toMatch(/^2507[2389]\d{7}$/)
    }
  })

  it('never republishes the fake +250780000000 placeholder', () => {
    expect(WHATSAPP_ORDERING_NUMBERS).not.toContain('+250780000000')
    for (const number of WHATSAPP_ORDERING_NUMBERS) {
      // Runs of trailing zeros are filler, not a real subscriber line.
      expect(number.replace(/\D/g, '')).not.toMatch(/^2507\d0{6,}$/)
    }
  })

  it('builds a wa.me deep link for each number', () => {
    expect(getWhatsAppLink()).toContain(`wa.me/${PRIMARY.replace('+', '')}`)
    expect(getWhatsAppLink(undefined, SECONDARY)).toContain(`wa.me/${SECONDARY.replace('+', '')}`)
    // The prefilled message must survive URL encoding.
    expect(getWhatsAppLink('Muraho', SECONDARY)).toContain('text=Muraho')
  })

  it('formats numbers for display without altering the dial string', () => {
    expect(formatWhatsAppDisplay(PRIMARY)).toBe('+250 790 215 965')
    expect(formatWhatsAppDisplay(SECONDARY)).toBe('+250 785 361 796')
    // Digits must round-trip: a display string is never used to dial.
    expect(formatWhatsAppDisplay(PRIMARY).replace(/\D/g, '')).toBe(PRIMARY.replace(/\D/g, ''))
  })

  it('surfaces both numbers on the contact page', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/contact/ContactPageClient.tsx'), 'utf8')
    // Rendering the list (not just BUSINESS.whatsapp) is what shows line two.
    expect(source).toContain('WHATSAPP_ORDERING_NUMBERS')
    expect(source).toContain('formatWhatsAppDisplay')
  })
})
