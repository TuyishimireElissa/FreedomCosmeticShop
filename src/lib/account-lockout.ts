import { prisma } from '@/lib/prisma'
import { normalizeRwandaPhone } from '@/lib/phone'
import { enqueueSms } from '@/server/services/sms-queue'
import { features } from '@/lib/env'
import { BUSINESS } from '@/lib/business-config'

export const MAX_FAILED_ATTEMPTS = 5
export const LOCKOUT_DURATION_MINUTES = 30
const WARNING_THRESHOLD = 3
const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'STAFF', 'MANAGER']

interface AttemptContext {
  ipAddress?: string
  userAgent?: string
  reason?: string
}

function normalizedIdentifier(identifier: string) {
  const value = identifier.trim()
  if (value.includes('@')) return { email: value.toLowerCase(), phone: undefined }
  try { return { phone: normalizeRwandaPhone(value), email: undefined } } catch { return { phone: value, email: undefined } }
}

function ownerPhone(): string | null {
  return process.env.SECURITY_OWNER_PHONE || process.env.STORE_WHATSAPP || process.env.NEXT_PUBLIC_WHATSAPP || null
}

async function sendSecuritySms(phone: string | null | undefined, message: string) {
  if (!features.sms || !phone) return
  try {
    await enqueueSms(phone, message, { priority: 0, template: 'SECURITY_ALERT' })
  } catch (error) {
    console.error('Security SMS enqueue failed:', error)
  }
}

export class AccountLockout {
  static async isLocked(identifier: string) {
    const normalized = normalizedIdentifier(identifier)
    const user = await prisma.user.findFirst({
      where: { OR: [normalized.phone ? { phone: normalized.phone } : undefined, normalized.email ? { email: normalized.email } : undefined].filter(Boolean) as Array<{ phone: string } | { email: string }> },
      select: { id: true, role: true, lockedUntil: true },
    })
    if (!user || !ADMIN_ROLES.includes(user.role) || !user.lockedUntil) return { locked: false as const }
    if (user.lockedUntil <= new Date()) {
      await prisma.user.update({ where: { id: user.id }, data: { lockedUntil: null, failedLoginCount: 0 } })
      return { locked: false as const }
    }
    return {
      locked: true as const,
      lockedUntil: user.lockedUntil,
      minutesLeft: Math.max(1, Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)),
    }
  }

  static async recordFailedAttempt(identifier: string, context: AttemptContext = {}) {
    const normalized = normalizedIdentifier(identifier)
    await prisma.failedLoginAttempt.create({
      data: {
        phone: normalized.phone,
        email: normalized.email,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        reason: context.reason || 'Invalid credentials',
      },
    })

    const user = await prisma.user.findFirst({
      where: { OR: [normalized.phone ? { phone: normalized.phone } : undefined, normalized.email ? { email: normalized.email } : undefined].filter(Boolean) as Array<{ phone: string } | { email: string }> },
      select: { id: true, name: true, phone: true, role: true, failedLoginCount: true, lockedUntil: true },
    })
    if (!user || !ADMIN_ROLES.includes(user.role)) {
      return { isLocked: false, attemptsLeft: MAX_FAILED_ATTEMPTS }
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return { isLocked: true, attemptsLeft: 0, lockedUntil: user.lockedUntil }
    }

    const newCount = user.failedLoginCount + 1
    if (newCount >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60_000)
      await prisma.$transaction([
        prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: newCount, lockedUntil } }),
        prisma.securityAlert.create({
          data: {
            type: 'ACCOUNT_LOCKED',
            severity: 'HIGH',
            title: 'Admin account locked',
            message: `An admin account was locked after ${MAX_FAILED_ATTEMPTS} failed login attempts.`,
            userId: user.id,
            ipAddress: context.ipAddress,
            metadata: { role: user.role, lockedUntil: lockedUntil.toISOString(), userAgent: context.userAgent },
          },
        }),
      ])
      await Promise.all([
        sendSecuritySms(user.phone, `${BUSINESS.tradingName} security alert: Your admin account was locked for ${LOCKOUT_DURATION_MINUTES} minutes after repeated failed login attempts. If this was not you, contact us: ${BUSINESS.phone}.`),
        ownerPhone() !== user.phone
          ? sendSecuritySms(ownerPhone(), `${BUSINESS.tradingName} SECURITY: An ${user.role} account was locked after ${MAX_FAILED_ATTEMPTS} failed login attempts. Review the security dashboard immediately.`)
          : Promise.resolve(),
      ])
      return { isLocked: true, attemptsLeft: 0, lockedUntil }
    }

    await prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: newCount } })
    if (newCount === WARNING_THRESHOLD) {
      await prisma.securityAlert.create({
        data: {
          type: 'REPEATED_LOGIN_FAILURE',
          severity: 'MEDIUM',
          title: 'Repeated admin login failures',
          message: 'Multiple failed login attempts were detected for an admin account.',
          userId: user.id,
          ipAddress: context.ipAddress,
          metadata: { failedLoginCount: newCount, userAgent: context.userAgent },
        },
      })
      await sendSecuritySms(user.phone, `${BUSINESS.tradingName} warning: Multiple failed login attempts were detected on your admin account. ${MAX_FAILED_ATTEMPTS - newCount} attempts remain before temporary lockout.`)
    }
    return { isLocked: false, attemptsLeft: MAX_FAILED_ATTEMPTS - newCount }
  }

  static async resetFailedAttempts(identifier: string, context: { ipAddress?: string; userAgent?: string } = {}) {
    const normalized = normalizedIdentifier(identifier)
    await prisma.user.updateMany({
      where: { OR: [normalized.phone ? { phone: normalized.phone } : undefined, normalized.email ? { email: normalized.email } : undefined].filter(Boolean) as Array<{ phone: string } | { email: string }> },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: context.ipAddress,
        lastLoginDevice: context.userAgent?.slice(0, 500),
      },
    })
  }
}
