import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { hasCurrentRetentionConsent } from '@/server/services/retention-messaging'

const read = (path: string) => readFileSync(path, 'utf8')
const service = read('src/server/services/retention-messaging.ts')
const stockRoute = read('src/app/api/retention/stock-alerts/route.ts')
const stockCancel = read('src/app/api/retention/stock-alerts/[id]/route.ts')
const reorderRoute = read('src/app/api/retention/reorder-reminders/route.ts')
const reorderCancel = read('src/app/api/retention/reorder-reminders/[id]/route.ts')
const dispatchRoute = read('src/app/api/admin/retention/dispatch/route.ts')
const abandonedRoute = read('src/app/api/sms/abandoned-cart/route.ts')
const smsOptOutRoute = read('src/app/api/sms/opt-out/route.ts')
const smsService = read('src/server/services/sms.ts')
const scheduler = read('src/server/services/sms-scheduler.ts')
const en = read('src/lib/i18n/translations/en.ts')
const rw = read('src/lib/i18n/translations/rw.ts')

const timestamp = new Date('2026-07-19T08:00:00.000Z')
const basePreference = {
  smsEnabled: true,
  smsConsentedAt: timestamp,
  smsRevokedAt: null,
  whatsappEnabled: false,
  whatsappConsentedAt: null,
  whatsappRevokedAt: null,
  reorderReminders: true,
  reorderConsentedAt: timestamp,
  reorderRevokedAt: null,
  priceDropAlerts: true,
  priceDropConsentedAt: timestamp,
  priceDropRevokedAt: null,
  backInStockAlerts: true,
  backInStockConsentedAt: timestamp,
  backInStockRevokedAt: null,
  abandonedCartReminders: true,
  abandonedCartConsentedAt: timestamp,
  abandonedCartRevokedAt: null,
}

describe('consent-gated alerts and reminders', () => {
  it('requires both current channel consent and current purpose consent', () => {
    expect(hasCurrentRetentionConsent(basePreference, 'SMS', 'REORDER')).toBe(true)
    expect(hasCurrentRetentionConsent({ ...basePreference, smsEnabled: false }, 'SMS', 'REORDER')).toBe(false)
    expect(hasCurrentRetentionConsent({ ...basePreference, reorderReminders: false }, 'SMS', 'REORDER')).toBe(false)
    expect(hasCurrentRetentionConsent(null, 'SMS', 'REORDER')).toBe(false)
  })

  it('treats a later revocation as immediate loss of consent', () => {
    const revoked = new Date(timestamp.getTime() + 1)
    expect(hasCurrentRetentionConsent({ ...basePreference, smsRevokedAt: revoked }, 'SMS', 'BACK_IN_STOCK')).toBe(false)
    expect(hasCurrentRetentionConsent({ ...basePreference, priceDropRevokedAt: revoked }, 'SMS', 'PRICE_DROP')).toBe(false)
    expect(hasCurrentRetentionConsent({ ...basePreference, backInStockRevokedAt: revoked }, 'SMS', 'BACK_IN_STOCK')).toBe(false)
  })

  it('rechecks live preferences under a row lock immediately before claiming delivery', () => {
    expect(service).toContain('FOR UPDATE')
    expect(service).toContain('tx.communicationPreference.findUnique')
    expect(service).toContain('hasCurrentRetentionConsent(preference')
    expect(service).toContain("status: 'CANCELLED'")
    expect(service).toContain("lastErrorCode: 'CONSENT_REVOKED'")
    expect(service).toContain('Prisma.TransactionIsolationLevel.Serializable')
  })

  it('resolves contact data only at dispatch and never stores it on alert/reminder writes', () => {
    expect(service).toContain("user: { select: { phone: true, isDeleted: true } }")
    for (const route of [stockRoute, reorderRoute]) {
      expect(route).not.toMatch(/data:\s*\{[^}]*phone/)
      expect(route).not.toMatch(/data:\s*\{[^}]*email/)
      expect(route).not.toMatch(/data:\s*\{[^}]*address/)
    }
  })

  it('does not use the legacy in-memory queue that could outlive a consent change', () => {
    expect(service).not.toContain('enqueueSms')
    expect(service).not.toContain('sms-queue')
    expect(service).toContain('sendSmsViaProvider')
  })

  it('does not claim simulated or disabled SMS as delivered', () => {
    expect(service).toContain("if (!features.sms) return 'FAILED'")
    expect(service).toContain("outcome: 'DELIVERY_DISABLED'")
    expect(service).toContain("lastErrorCode: 'SMS_DISABLED'")
    expect(service).not.toMatch(/outcome:\s*'SIMULATED'/)
  })

  it('leaves unsupported WhatsApp delivery blocked instead of pretending it sent', () => {
    expect(service).toContain("alert.channel !== 'SMS'")
    expect(service).toContain("reminder.channel !== 'SMS'")
    expect(service).toContain("lastErrorCode: 'CHANNEL_UNAVAILABLE'")
    expect(stockRoute).toContain("channel: z.literal('SMS')")
    expect(reorderRoute).toContain("channel: z.literal('SMS')")
  })

  it('requires explicit consent when creating alerts and reminders', () => {
    expect(stockRoute).toContain('hasCurrentRetentionConsent(preference, data.channel, purpose)')
    expect(stockRoute).toContain("error: 'CONSENT_REQUIRED'")
    expect(reorderRoute).toContain("hasCurrentRetentionConsent(preference, data.channel, 'REORDER')")
    expect(reorderRoute).toContain("error: 'CONSENT_REQUIRED'")
  })

  it('requires a delivered matching purchase and a user-selected reorder date', () => {
    expect(reorderRoute).toContain("status: 'DELIVERED'")
    expect(reorderRoute).toContain("items: { some: { productId: data.productId } }")
    expect(reorderRoute).toContain("dueAt: z.string().datetime()")
    expect(reorderRoute).not.toMatch(/estimatedDays[^\n]*@default|estimatedDays:\s*(30|45|60|90)/)
  })

  it('supports authenticated immediate cancellation of unsent records', () => {
    for (const route of [stockCancel, reorderCancel]) {
      expect(route).toContain('requireAuth')
      expect(route).toContain('userId: user.id')
      expect(route).toContain("status: 'CANCELLED'")
      expect(route).toContain('consentGranted: false')
      expect(route).toContain("'Cache-Control': 'private, no-store, max-age=0'")
    }
  })

  it('removes client-supplied identity and contact data from abandoned-cart tracking', () => {
    expect(abandonedRoute).toContain('requireAuth')
    expect(abandonedRoute).toContain("hasCurrentRetentionConsent(preference, 'SMS', 'ABANDONED_CART')")
    expect(abandonedRoute).toContain('.strict()')
    expect(abandonedRoute).not.toMatch(/userId:\s*z\.|phone:\s*z\./)
    expect(scheduler).not.toMatch(/interface AbandonedCart[\s\S]*?phone:\s*string/)
    expect(scheduler).toContain("hasCurrentRetentionConsent(preference, 'SMS', 'ABANDONED_CART')")
    expect(scheduler).not.toContain('enqueueSms(cart.phone')
  })

  it('makes the legacy SMS opt-out durable and cancels unsent retention records', () => {
    expect(smsOptOutRoute).toContain('communicationPreference.upsert')
    expect(smsOptOutRoute).toContain('smsEnabled: false')
    expect(smsOptOutRoute).toContain('smsRevokedAt: now')
    expect(smsOptOutRoute).toContain('db.stockAlert.updateMany')
    expect(smsOptOutRoute).toContain('db.reorderReminder.updateMany')
    expect(smsOptOutRoute).toContain("status: 'CANCELLED'")
    expect(smsOptOutRoute).toContain('clearCartTracking(user.id)')
    expect(smsOptOutRoute).not.toContain('phone,\n      optedOut')
    expect(smsService).not.toContain('[SMS Opt-out]')
    expect(smsService).not.toContain('[SMS Opt-in]')
  })

  it('requires authentication for opt-in and does not enable any reminder purpose', () => {
    expect(smsOptOutRoute).toContain('export async function DELETE')
    expect(smsOptOutRoute).toContain('const user = await requireAuth()')
    expect(smsOptOutRoute).toContain('smsEnabled: true')
    expect(smsOptOutRoute).not.toMatch(/reorderReminders:\s*true|priceDropAlerts:\s*true|backInStockAlerts:\s*true|abandonedCartReminders:\s*true/)
  })

  it('uses translated message keys and marks every new Kinyarwanda line verified-rw', () => {
    expect(service).toContain("'retention_messages.price_drop'")
    expect(service).toContain("'retention_messages.back_in_stock'")
    expect(service).toContain("'retention_messages.reorder'")
    expect(en).toContain('retention_messages:')
    const block = rw.match(/retention_messages: \{([\s\S]*?)\n  \},/)?.[1] || ''
    expect(block.match(/\/\/ verified-rw/g)).toHaveLength(3)
  })

  it('protects dispatch with custom permissions, rate limiting, and origin checks', () => {
    expect(dispatchRoute).toContain('requirePermission(PERMISSIONS.SMS_SEND)')
    expect(dispatchRoute).toContain('rateLimit')
    expect(dispatchRoute).toContain('INVALID_ORIGIN')
    expect(dispatchRoute).not.toContain('getServerSession')
  })
})
