import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const page = readFileSync(resolve(process.cwd(), 'src/app/support/whatsapp/page.tsx'), 'utf8')
const view = readFileSync(resolve(process.cwd(), 'src/components/support/WhatsAppSupportView.tsx'), 'utf8')
const en = readFileSync(resolve(process.cwd(), 'src/lib/i18n/translations/en.ts'), 'utf8')
const rw = readFileSync(resolve(process.cwd(), 'src/lib/i18n/translations/rw.ts'), 'utf8')

describe('honest WhatsApp support hub', () => {
  it('provides the public support route and mobile-first controls', () => {
    expect(page).toContain('<WhatsAppSupportView />')
    expect(view).toContain('min-h-[132px]')
    expect(view).toContain('min-h-[60px]')
    expect(view).toContain('touch-manipulation')
  })

  it('does not invent an agent, online status, response promise, or telephone number', () => {
    expect(view).toContain("WA_CONFIG.agentName || t('whatsapp.agent_name_unpublished')")
    expect(view).toContain("t('whatsapp.availability_not_claimed')")
    expect(view).toContain("t('whatsapp.hours_unpublished')")
    expect(view).toContain("const hasPhone = !BUSINESS.phone.includes('TODO:')")
    expect(view).not.toContain('animate-pulse')
    expect(view).not.toContain('Online')
    expect(view).not.toContain('within 30 minutes')
  })

  it('opens accurate topic inquiries and tracks each shortcut without PII', () => {
    for (const event of ['payment_help', 'delivery_inquiry', 'returns_inquiry', 'authenticity_check', 'general_support']) expect(view).toContain(`'${event}'`)
    expect(view.indexOf("window.open(url")).toBeLessThan(view.indexOf('trackWhatsAppClick(event'))
    expect(view).not.toContain('customerName')
    expect(view).not.toContain('sessionId')
    expect(view).not.toContain('userId')
  })

  it('shows only the owner-confirmed WhatsApp destination and hides placeholder phone support', () => {
    expect(view).toContain("t('whatsapp.verified_number', { number: `+${WA_CONFIG.number}` })")
    expect(view).toContain('{hasPhone ?')
    expect(view).toContain('href={`tel:${BUSINESS.phone}`}')
  })

  it('has matching verified Kinyarwanda support translations', () => {
    for (const key of ['support_title', 'support_subtitle', 'agent_name_unpublished', 'availability_not_claimed', 'hours_unpublished', 'quick_replies', 'support_payment_inquiry', 'support_delivery_inquiry', 'support_returns_inquiry', 'support_authenticity_inquiry', 'start_chat']) {
      expect(en).toMatch(new RegExp(`\\b${key}:`))
      expect(rw).toMatch(new RegExp(`\\b${key}:.*// verified-rw`))
    }
  })
})
