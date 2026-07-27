import { randomBytes } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'

export type RetentionRewardErrorCode =
  | 'INVALID_CODE'
  | 'SELF_REFERRAL'
  | 'REFERRAL_INACTIVE'
  | 'REFERRAL_POLICY_NOT_CONFIGURED'
  | 'REFERRAL_NOT_STARTED'
  | 'REFERRAL_ENDED'
  | 'REFERRAL_LIMIT_REACHED'
  | 'BIRTHDAY_REWARD_NOT_AVAILABLE'
  | 'BIRTHDAY_CONSENT_REQUIRED'
  | 'BIRTHDAY_REWARD_NOT_DUE'

export class RetentionRewardError extends Error {
  constructor(public readonly code: RetentionRewardErrorCode) {
    super(code)
    this.name = 'RetentionRewardError'
  }
}

export function createRandomReferralCode(): string {
  // 96 random bits; no customer identity is encoded in the public code.
  return `FCS-${randomBytes(12).toString('hex').toUpperCase()}`
}

export async function getOrCreateReferralCode(userId: string) {
  const existing = await db.referralCode.findUnique({ where: { userId } })
  if (existing) return existing

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await db.referralCode.create({
        data: { userId, code: createRandomReferralCode() },
      })
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error
      const raced = await db.referralCode.findUnique({ where: { userId } })
      if (raced) return raced
    }
  }
  throw new Error('REFERRAL_CODE_GENERATION_FAILED')
}

function consentIsCurrent(consentedAt: Date | null, revokedAt: Date | null): boolean {
  return Boolean(consentedAt && (!revokedAt || consentedAt > revokedAt))
}

export async function redeemReferralCode(referredUserId: string, suppliedCode: string, now = new Date()) {
  const code = suppliedCode.trim().toUpperCase()
  if (!/^FCS-[A-F0-9]{24}$/.test(code)) throw new RetentionRewardError('INVALID_CODE')

  try {
    return await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "ReferralCode" WHERE code = ${code} FOR UPDATE`
      const referral = await tx.referralCode.findUnique({ where: { code } })
      if (!referral) throw new RetentionRewardError('INVALID_CODE')

      const existing = await tx.referralRedemption.findUnique({ where: { referredUserId } })
      if (existing) {
        return {
          redemptionId: existing.id,
          alreadyRedeemed: true,
          referrerPointsAwarded: existing.referrerPointsAwarded,
          discountEligibility: existing.discountType && existing.discountValue
            ? { type: existing.discountType, value: existing.discountValue }
            : null,
        }
      }

      if (referral.userId === referredUserId) throw new RetentionRewardError('SELF_REFERRAL')
      if (!referral.isActive) throw new RetentionRewardError('REFERRAL_INACTIVE')
      if (!referral.policyConfiguredAt) throw new RetentionRewardError('REFERRAL_POLICY_NOT_CONFIGURED')
      if (referral.startsAt && referral.startsAt > now) throw new RetentionRewardError('REFERRAL_NOT_STARTED')
      if (referral.endsAt && referral.endsAt < now) throw new RetentionRewardError('REFERRAL_ENDED')
      if (referral.maxUses !== null && referral.usedCount >= referral.maxUses) {
        throw new RetentionRewardError('REFERRAL_LIMIT_REACHED')
      }

      const points = referral.pointsPerUse ?? 0
      const hasDiscount = Boolean(referral.discountType && referral.discountValue && referral.discountValue > 0)
      if (points <= 0 && !hasDiscount) throw new RetentionRewardError('REFERRAL_POLICY_NOT_CONFIGURED')

      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${referral.userId} FOR UPDATE`
      const referrer = await tx.user.findFirst({
        where: { id: referral.userId, isDeleted: false },
        select: { loyaltyPoints: true },
      })
      if (!referrer) throw new RetentionRewardError('REFERRAL_INACTIVE')

      const newBalance = referrer.loyaltyPoints + Math.max(0, points)
      const redemption = await tx.referralRedemption.create({
        data: {
          referralCodeId: referral.id,
          referredUserId,
          referrerPointsAwarded: Math.max(0, points),
          discountType: hasDiscount ? referral.discountType : null,
          discountValue: hasDiscount ? referral.discountValue : null,
        },
      })

      await tx.referralCode.update({ where: { id: referral.id }, data: { usedCount: { increment: 1 } } })
      if (points > 0) {
        await tx.user.update({ where: { id: referral.userId }, data: { loyaltyPoints: newBalance } })
        await tx.loyaltyPoints.create({
          data: {
            userId: referral.userId,
            points,
            type: 'BONUS',
            reason: 'Configured referral reward',
            balanceAfter: newBalance,
          },
        })
      }

      return {
        redemptionId: redemption.id,
        alreadyRedeemed: false,
        referrerPointsAwarded: Math.max(0, points),
        // This is eligibility metadata only. It is not represented as an
        // applied coupon or advertised as a completed discount.
        discountEligibility: hasDiscount
          ? { type: referral.discountType!, value: referral.discountValue! }
          : null,
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await db.referralRedemption.findUnique({ where: { referredUserId } })
      if (existing) {
        return {
          redemptionId: existing.id,
          alreadyRedeemed: true,
          referrerPointsAwarded: existing.referrerPointsAwarded,
          discountEligibility: existing.discountType && existing.discountValue
            ? { type: existing.discountType, value: existing.discountValue }
            : null,
        }
      }
    }
    throw error
  }
}

export async function claimConfiguredBirthdayReward(userId: string, now = new Date()) {
  const rewardYear = now.getUTCFullYear()
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "BirthdayReward" WHERE "userId" = ${userId} AND "rewardYear" = ${rewardYear} FOR UPDATE`
    const reward = await tx.birthdayReward.findUnique({
      where: { userId_rewardYear: { userId, rewardYear } },
    })
    if (!reward || reward.status !== 'READY' || !reward.rewardPoints || reward.rewardPoints <= 0) {
      throw new RetentionRewardError('BIRTHDAY_REWARD_NOT_AVAILABLE')
    }
    if (reward.expiresAt && reward.expiresAt < now) throw new RetentionRewardError('BIRTHDAY_REWARD_NOT_AVAILABLE')
    if (reward.birthMonth !== now.getUTCMonth() + 1 || reward.birthDay !== now.getUTCDate()) {
      throw new RetentionRewardError('BIRTHDAY_REWARD_NOT_DUE')
    }

    const preference = await tx.communicationPreference.findUnique({ where: { userId } })
    if (!preference?.birthdayRewards || !consentIsCurrent(preference.birthdayConsentedAt, preference.birthdayRevokedAt)) {
      throw new RetentionRewardError('BIRTHDAY_CONSENT_REQUIRED')
    }

    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`
    const user = await tx.user.findFirst({ where: { id: userId, isDeleted: false }, select: { loyaltyPoints: true } })
    if (!user) throw new RetentionRewardError('BIRTHDAY_REWARD_NOT_AVAILABLE')
    const balanceAfter = user.loyaltyPoints + reward.rewardPoints

    await tx.user.update({ where: { id: userId }, data: { loyaltyPoints: balanceAfter } })
    await tx.loyaltyPoints.create({
      data: {
        userId,
        points: reward.rewardPoints,
        type: 'BONUS',
        reason: 'Configured birthday reward',
        balanceAfter,
        expiresAt: reward.expiresAt,
      },
    })
    await tx.birthdayReward.update({
      where: { id: reward.id },
      data: { status: 'REDEEMED', redeemedAt: now, consentGranted: true, consentCheckedAt: now },
    })

    return { pointsAwarded: reward.rewardPoints, balance: balanceAfter }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}
