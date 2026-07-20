import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createRandomReferralCode } from '@/server/services/retention-rewards'

const read = (path: string) => readFileSync(path, 'utf8')
const schema = read('prisma/schema.prisma')
const service = read('src/server/services/retention-rewards.ts')
const referralCodeRoute = read('src/app/api/referrals/code/route.ts')
const referralRedeemRoute = read('src/app/api/referrals/redeem/route.ts')
const birthdayRoute = read('src/app/api/loyalty/birthday/route.ts')
const referralAdminRoute = read('src/app/api/admin/referrals/[id]/route.ts')
const birthdayAdminRoute = read('src/app/api/admin/loyalty/birthday/route.ts')

describe('policy-controlled loyalty and referral system', () => {
  it('generates random referral codes without embedding identity', () => {
    const codes = new Set(Array.from({ length: 20 }, () => createRandomReferralCode()))
    expect(codes.size).toBe(20)
    for (const code of codes) expect(code).toMatch(/^FCS-[A-F0-9]{24}$/)
    expect(service).toContain('randomBytes(12)')
    expect(service).not.toMatch(/userName|\.name.*referral|phone.*code/i)
  })

  it('tracks one referral redemption per authenticated referred user without PII snapshots', () => {
    expect(schema).toContain('model ReferralRedemption')
    expect(schema).toMatch(/referredUserId\s+String\s+@unique/)
    const model = schema.match(/model ReferralRedemption \{([\s\S]*?)\n\}/)?.[1] || ''
    expect(model).not.toMatch(/\b(phone|email|name|address)\s+String/i)
  })

  it('requires an active, explicitly configured referral policy', () => {
    expect(service).toContain("if (!referral.isActive) throw new RetentionRewardError('REFERRAL_INACTIVE')")
    expect(service).toContain("if (!referral.policyConfiguredAt) throw new RetentionRewardError('REFERRAL_POLICY_NOT_CONFIGURED')")
    expect(service).toContain("if (points <= 0 && !hasDiscount) throw new RetentionRewardError('REFERRAL_POLICY_NOT_CONFIGURED')")
    expect(referralAdminRoute).toContain('hasConfiguredBenefit')
    expect(referralAdminRoute).not.toMatch(/200|discountValue:\s*10|pointsPerUse:\s*200/)
  })

  it('blocks self-referrals and enforces dates and usage limits under a row lock', () => {
    expect(service).toContain('FOR UPDATE')
    expect(service).toContain("throw new RetentionRewardError('SELF_REFERRAL')")
    expect(service).toContain("throw new RetentionRewardError('REFERRAL_NOT_STARTED')")
    expect(service).toContain("throw new RetentionRewardError('REFERRAL_ENDED')")
    expect(service).toContain("throw new RetentionRewardError('REFERRAL_LIMIT_REACHED')")
  })

  it('updates the referral ledger and loyalty balance atomically and idempotently', () => {
    expect(service).toContain('Prisma.TransactionIsolationLevel.Serializable')
    expect(service).toContain('tx.referralRedemption.create')
    expect(service).toContain("type: 'BONUS'")
    expect(service).toContain("reason: 'Configured referral reward'")
    expect(service).toContain("error.code === 'P2002'")
  })

  it('does not misrepresent referral discount eligibility as an applied coupon', () => {
    expect(service).toContain('discountEligibility')
    expect(service).toContain('eligibility metadata only')
    expect(service).not.toContain('tx.coupon.create')
  })

  it('requires current birthday-purpose consent before granting configured points', () => {
    expect(service).toContain('preference?.birthdayRewards')
    expect(service).toContain('consentIsCurrent(preference.birthdayConsentedAt, preference.birthdayRevokedAt)')
    expect(service).toContain("throw new RetentionRewardError('BIRTHDAY_CONSENT_REQUIRED')")
    expect(service).toContain("reward.status !== 'READY'")
  })

  it('makes birthday claims date-bound, one-time, and transactionally recorded', () => {
    expect(service).toContain('reward.birthMonth !== now.getUTCMonth() + 1')
    expect(service).toContain('reward.birthDay !== now.getUTCDate()')
    expect(service).toContain("data: { status: 'REDEEMED', redeemedAt: now")
    expect(birthdayAdminRoute).toContain("existing?.status === 'REDEEMED'")
    expect(birthdayAdminRoute).toContain('REWARD_ALREADY_REDEEMED')
  })

  it('uses custom JWT authentication, permissions, origin checks, rate limits, and private responses', () => {
    for (const route of [referralCodeRoute, referralRedeemRoute, birthdayRoute]) {
      expect(route).toContain('requireAuth')
      expect(route).not.toContain('getServerSession')
      expect(route).toContain("'Cache-Control': 'private, no-store, max-age=0'")
    }
    expect(referralRedeemRoute).toContain('rateLimit')
    expect(birthdayRoute).toContain('rateLimit')
    expect(referralAdminRoute).toContain('requirePermission(PERMISSIONS.COUPONS_UPDATE)')
    expect(birthdayAdminRoute).toContain('requirePermission(PERMISSIONS.CUSTOMERS_UPDATE)')
  })

  it('does not send SMS, WhatsApp, or email while processing rewards', () => {
    expect(service).not.toMatch(/sendSms|enqueueSms|sendWhatsApp|sendEmail/)
    expect(referralRedeemRoute).not.toMatch(/sendSms|enqueueSms|sendWhatsApp|sendEmail/)
    expect(birthdayRoute).not.toMatch(/sendSms|enqueueSms|sendWhatsApp|sendEmail/)
  })
})
