import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')
const api = read('src/app/api/user/communication-preferences/route.ts')
const ui = read('src/components/settings/CommunicationPreferences.tsx')
const page = read('src/app/account/settings/page.tsx')
const schema = read('prisma/schema.prisma')
const en = read('src/lib/i18n/translations/en.ts')
const rw = read('src/lib/i18n/translations/rw.ts')

const purposes = [
  'reorderReminders',
  'priceDropAlerts',
  'backInStockAlerts',
  'birthdayRewards',
  'postDeliveryTips',
  'abandonedCartReminders',
  'wishlistReminders',
]

describe('accessible communication preference controls', () => {
  it('keeps every channel and purpose off by default', () => {
    const model = schema.match(/model CommunicationPreference \{([\s\S]*?)\n\}/)?.[1] || ''
    for (const field of ['smsEnabled', 'whatsappEnabled', 'emailEnabled', ...purposes]) {
      expect(model).toMatch(new RegExp(`${field}\\s+Boolean\\s+@default\\(false\\)`))
      expect(ui).toMatch(new RegExp(`${field}: false`))
    }
  })

  it('accepts only a strict allowlist and never accepts client consent timestamps', () => {
    expect(api).toContain('}).strict().refine')
    expect(api).not.toMatch(/z\.object\(\{[\s\S]*ConsentedAt:\s*z\./)
    expect(api).not.toMatch(/z\.object\(\{[\s\S]*RevokedAt:\s*z\./)
    expect(api).toContain("language: z.enum(['rw', 'en']).optional()")
  })

  it('records explicit server timestamps for opt-in and opt-out', () => {
    expect(api).toContain('update[times.consentedAt] = now')
    expect(api).toContain('update[times.revokedAt] = null')
    expect(api).toContain('update[times.revokedAt] = now')
    expect(api).toContain('Prisma.TransactionIsolationLevel.Serializable')
  })

  it('immediately cancels matching unsent reminders when a channel or purpose is disabled', () => {
    expect(api).toContain('tx.reorderReminder.updateMany')
    expect(api).toContain('tx.stockAlert.updateMany')
    expect(api).toContain("status: 'CANCELLED'")
    expect(api).toContain('consentGranted: false')
    expect(api).toContain('clearCartTracking(user.id)')
    expect(api).toContain("lastErrorCode: smsDisabled ? 'SMS_OPT_OUT' : 'PURPOSE_OPT_OUT'")
  })

  it('does not claim unavailable WhatsApp or email delivery', () => {
    expect(api).toContain('parsed.data.whatsappEnabled === true')
    expect(api).toContain('parsed.data.emailEnabled === true')
    expect(api).toContain("error: 'CHANNEL_UNAVAILABLE'")
    expect(api).toContain('availability: { sms: features.sms, whatsapp: false, email: false }')
    expect(api).toContain('(parsed.data.smsEnabled === true && !features.sms)')
    expect(ui).toContain('disabled={!available || Boolean(pending)}')
    expect(ui).toContain("t('communication_preferences.unavailable')")
  })

  it('uses custom authentication, same-origin checks, rate limiting, and private responses', () => {
    expect(api).toContain('requireAuth')
    expect(api).toContain('INVALID_ORIGIN')
    expect(api).toContain('rateLimit')
    expect(api).toContain("'Cache-Control': 'private, no-store, max-age=0'")
    expect(api).not.toContain('getServerSession')
  })

  it('auto-saves each explicit choice rather than batching opt-outs locally', () => {
    expect(ui).toContain("method: 'PATCH'")
    expect(ui).toContain('onChange={(event) => void save')
    expect(ui).toContain('setPreferences(optimistic)')
    expect(ui).toContain('setPreferences(previous)')
  })

  it('provides accessible native switches, fieldsets, live status, and large targets', () => {
    expect(ui.match(/<fieldset/g)?.length).toBeGreaterThanOrEqual(3)
    expect(ui).toContain('type="checkbox" role="switch"')
    expect(ui).toContain('type="radio"')
    expect(ui).toContain('role="status" aria-live="polite"')
    expect(ui).toMatch(/min-h-(12|\[68px\])/)
    expect(ui).toContain('focus:ring-2')
  })

  it('supports a saved Kinyarwanda or English message language', () => {
    expect(ui).toContain("(['rw', 'en'] as const)")
    expect(ui).toContain("setLanguage(update.language)")
    expect(api).toContain("preference?.language === 'en' ? 'en' : 'rw'")
  })

  it('renders all interface copy through translation keys', () => {
    expect(ui).toContain("t('communication_preferences.title')")
    expect(ui).toContain('t(item.label)')
    expect(ui).toContain('t(item.description)')
    expect(ui).not.toMatch(/>\s*(Messages|Channels|SMS|WhatsApp|Email|Saving|Preference saved)[^<{]*</)
    expect(en).toContain('communication_preferences:')
    expect(rw).toContain('communication_preferences:')
  })

  it('marks every Kinyarwanda preference line with verified-rw', () => {
    const block = rw.match(/communication_preferences: \{([\s\S]*?)\n  \},/)?.[1] || ''
    const values = block.split('\n').filter((line) => line.includes(':'))
    expect(values.length).toBeGreaterThan(30)
    for (const line of values) expect(line).toContain('// verified-rw')
  })

  it('mounts the controls on the existing account settings page without removing prior settings', () => {
    expect(page).toContain('<CommunicationPreferences />')
    expect(page).toContain('<LowDataToggle />')
    expect(page).toContain('<AnalyticsConsentSettings />')
  })
})
