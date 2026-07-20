import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const schema = readFileSync('prisma/schema.prisma', 'utf8')

function model(name: string): string {
  const match = schema.match(new RegExp(`model ${name} \\{([\\s\\S]*?)\\n\\}`, 'm'))
  if (!match) throw new Error(`Missing Prisma model: ${name}`)
  return match[1]
}

describe('privacy-first retention schema', () => {
  it('adds every approved retention model additively', () => {
    for (const name of [
      'ReferralCode',
      'BirthdayReward',
      'ReorderReminder',
      'StockAlert',
      'CommunicationPreference',
      'CustomerSegment',
    ]) {
      expect(model(name)).toBeTruthy()
    }
  })

  it('defaults every communication purpose and channel to off', () => {
    const preferences = model('CommunicationPreference')
    for (const field of [
      'smsEnabled',
      'whatsappEnabled',
      'emailEnabled',
      'reorderReminders',
      'priceDropAlerts',
      'backInStockAlerts',
      'birthdayRewards',
      'postDeliveryTips',
      'abandonedCartReminders',
      'wishlistReminders',
    ]) {
      expect(preferences).toMatch(new RegExp(`${field}\\s+Boolean\\s+@default\\(false\\)`))
    }
  })

  it('records channel and purpose consent/revocation timestamps', () => {
    const preferences = model('CommunicationPreference')
    for (const field of [
      'smsConsentedAt', 'smsRevokedAt',
      'whatsappConsentedAt', 'whatsappRevokedAt',
      'reorderConsentedAt', 'reorderRevokedAt',
      'abandonedCartConsentedAt', 'abandonedCartRevokedAt',
      'wishlistConsentedAt', 'wishlistRevokedAt',
    ]) {
      expect(preferences).toMatch(new RegExp(`${field}\\s+DateTime\\?`))
    }
  })

  it('does not duplicate contact details in reminder and alert records', () => {
    for (const name of ['ReorderReminder', 'StockAlert']) {
      const record = model(name)
      expect(record).not.toMatch(/\b(phone|email|name|address)\s+String/i)
      expect(record).toMatch(/status\s+String\s+@default\("BLOCKED"\)/)
      expect(record).toMatch(/consentGranted\s+Boolean\s+@default\(false\)/)
      expect(record).toMatch(/consentCheckedAt\s+DateTime\?/)
    }
  })

  it('stores birthday month/day without a full date or birth year', () => {
    const birthday = model('BirthdayReward')
    expect(birthday).toMatch(/birthMonth\s+Int/)
    expect(birthday).toMatch(/birthDay\s+Int/)
    expect(birthday).not.toMatch(/birth(Date|Year|day)\s+/)
    expect(birthday).toMatch(/rewardPoints\s+Int\?/)
    expect(birthday).not.toMatch(/rewardPoints\s+Int\s+@default/)
  })

  it('does not invent active referral rewards, reminder timing, or customer segments', () => {
    const referral = model('ReferralCode')
    expect(referral).toMatch(/isActive\s+Boolean\s+@default\(false\)/)
    expect(referral).toMatch(/pointsPerUse\s+Int\?/)
    expect(referral).toMatch(/discountValue\s+Int\?/)

    expect(model('ReorderReminder')).toMatch(/estimatedDays\s+Int\?/)

    const segment = model('CustomerSegment')
    expect(segment).toMatch(/segment\s+String\s+@default\("UNCLASSIFIED"\)/)
    expect(segment).toMatch(/isActive\s+Boolean\s+@default\(false\)/)
    expect(segment).not.toMatch(/VIP|AT_RISK|30|45|60|90/)
  })
})
