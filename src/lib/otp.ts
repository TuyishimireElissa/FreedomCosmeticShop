import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'
import { db } from '@/lib/db'
import { features } from '@/lib/env'
import { BUSINESS } from '@/lib/business-config'
import { sendSms } from '@/server/services/sms'

export type OtpType = 'REGISTER' | 'LOGIN' | 'RESET'

export interface OtpEntry {
  code: string
  phone: string
  type: OtpType
  registrationData?: { name: string; email: string | null; passwordHash: string }
  expiresAt: number
  attempts: number
  createdAt: number
}

const OTP_TTL_MS = 5 * 60 * 1000
const MAX_OTP_PER_PHONE_WINDOW = 3
const OTP_PHONE_WINDOW_MS = 10 * 60 * 1000
const MAX_OTP_ATTEMPTS = 5
const MAX_OTP_PER_IP_WINDOW = 10
const OTP_IP_WINDOW_MS = 60 * 60 * 1000
const OTP_HASH_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'development-otp-secret-only'

export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

function hashOtp(code: string, phone: string, type: OtpType) {
  return createHmac('sha256', OTP_HASH_SECRET).update(`${type}:${phone}:${code}`).digest('hex')
}

function hashesMatch(left: string, right: string) {
  try {
    const a = Buffer.from(left, 'hex')
    const b = Buffer.from(right, 'hex')
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export interface CreateOtpOptions {
  phone: string
  type: OtpType
  ip: string
  registrationData?: { name: string; email: string | null; passwordHash: string }
}

export interface CreateOtpResult {
  success: boolean
  code?: string
  error?: string
  retryAfterMs?: number
}

export async function createOtp(options: CreateOtpOptions): Promise<CreateOtpResult> {
  const now = new Date()
  const phoneWindow = new Date(now.getTime() - OTP_PHONE_WINDOW_MS)
  const ipWindow = new Date(now.getTime() - OTP_IP_WINDOW_MS)
  const [phoneRequests, ipRequests] = await Promise.all([
    db.otpVerification.count({ where: { phone: options.phone, createdAt: { gte: phoneWindow } } }),
    db.otpVerification.count({ where: { ipAddress: options.ip, createdAt: { gte: ipWindow } } }),
  ])
  if (phoneRequests >= MAX_OTP_PER_PHONE_WINDOW) {
    return { success: false, error: 'Too many OTP requests. Please wait 10 minutes.', retryAfterMs: OTP_PHONE_WINDOW_MS }
  }
  if (ipRequests >= MAX_OTP_PER_IP_WINDOW) {
    return { success: false, error: 'Too many requests from your device. Please try again later.', retryAfterMs: OTP_IP_WINDOW_MS }
  }

  if (process.env.NODE_ENV === 'production' && !features.sms) {
    return { success: false, error: 'SMS verification is temporarily unavailable. Please try again later.' }
  }

  const code = generateOtpCode()
  const codeHash = hashOtp(code, options.phone, options.type)
  await db.$transaction([
    db.otpVerification.updateMany({
      where: { phone: options.phone, type: options.type, isUsed: false },
      data: { isUsed: true, usedAt: now },
    }),
    db.otpVerification.create({
      data: {
        phone: options.phone,
        type: options.type,
        codeHash,
        registrationData: options.registrationData || undefined,
        ipAddress: options.ip === 'unknown' ? null : options.ip,
        expiresAt: new Date(now.getTime() + OTP_TTL_MS),
      },
    }),
  ])

  const smsBody = `${BUSINESS.tradingName}: Your verification code is ${code}. It expires in 5 minutes. Do not share it with anyone.`
  const smsResult = await sendSms(options.phone, smsBody)
  if (!smsResult.success) {
    await db.otpVerification.updateMany({ where: { phone: options.phone, type: options.type, codeHash, isUsed: false }, data: { isUsed: true, usedAt: new Date() } })
    console.error('Failed to send OTP SMS:', smsResult.message)
    return { success: false, error: 'Verification SMS could not be sent. Please try again later.' }
  }

  // Development can expose the code for local testing; production never does.
  return { success: true, code: process.env.NODE_ENV === 'production' ? undefined : code }
}

export interface VerifyOtpResult {
  success: boolean
  error?: string
  registrationData?: { name: string; email: string | null; passwordHash: string }
}

export async function verifyOtp(phone: string, type: OtpType, inputCode: string): Promise<VerifyOtpResult> {
  const entry = await db.otpVerification.findFirst({
    where: { phone, type, isUsed: false },
    orderBy: { createdAt: 'desc' },
  })
  if (!entry) return { success: false, error: 'No OTP found. Please request a new code.' }
  if (entry.expiresAt.getTime() < Date.now()) {
    await db.otpVerification.update({ where: { id: entry.id }, data: { isUsed: true, usedAt: new Date() } })
    return { success: false, error: 'OTP has expired. Please request a new code.' }
  }
  if (entry.attempts >= MAX_OTP_ATTEMPTS) {
    await db.otpVerification.update({ where: { id: entry.id }, data: { isUsed: true, usedAt: new Date() } })
    return { success: false, error: 'Too many incorrect attempts. Please request a new code.' }
  }

  const valid = hashesMatch(entry.codeHash, hashOtp(inputCode, phone, type))
  if (!valid) {
    const attempts = entry.attempts + 1
    await db.otpVerification.update({ where: { id: entry.id }, data: { attempts, ...(attempts >= MAX_OTP_ATTEMPTS ? { isUsed: true, usedAt: new Date() } : {}) } })
    const remaining = Math.max(0, MAX_OTP_ATTEMPTS - attempts)
    return { success: false, error: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` }
  }

  await db.otpVerification.update({ where: { id: entry.id }, data: { isUsed: true, usedAt: new Date() } })
  const registrationData = entry.registrationData as { name?: unknown; email?: unknown; passwordHash?: unknown } | null
  if (type === 'REGISTER' && (!registrationData || typeof registrationData.name !== 'string' || typeof registrationData.passwordHash !== 'string')) {
    return { success: false, error: 'Registration data missing from OTP.' }
  }
  return {
    success: true,
    registrationData: registrationData ? {
      name: registrationData.name as string,
      email: typeof registrationData.email === 'string' ? registrationData.email : null,
      passwordHash: registrationData.passwordHash as string,
    } : undefined,
  }
}

export async function hasOtp(phone: string, type: OtpType): Promise<boolean> {
  const count = await db.otpVerification.count({ where: { phone, type, isUsed: false, expiresAt: { gt: new Date() } } })
  return count > 0
}
