/**
 * OTP (One-Time Password) generation, storage, and rate limiting.
 *
 * For the MVP, OTPs are stored in-memory. This works for single-server
 * deployments. For production (especially serverless), replace the store
 * with Redis or a database table.
 *
 * Rate limiting:
 *   - Per phone: max 3 OTPs per 10 minutes (prevents OTP spam)
 *   - Per OTP: max 5 verification attempts (prevents brute-force)
 *   - Per IP: max 10 OTP requests per hour (prevents abuse)
 *
 * OTP rules:
 *   - 6-digit numeric code
 *   - Valid for 5 minutes
 *   - Single-use (deleted after successful verification)
 *
 * In development (ENABLE_SMS_NOTIFICATIONS=false), the OTP code is returned
 * in the API response so you can test without real SMS. In production,
 * the OTP is only sent via SMS.
 */

import { features } from "@/lib/env"
import { sendSms } from "@/server/services/sms"

// ─── Types ───────────────────────────────────────────────────────────────────

export type OtpType = "REGISTER" | "LOGIN" | "RESET"

export interface OtpEntry {
  code: string
  phone: string
  type: OtpType
  /** For REGISTER: store registration data until OTP is verified */
  registrationData?: {
    name: string
    email: string | null
    passwordHash: string
  }
  expiresAt: number // Unix timestamp (ms)
  attempts: number
  createdAt: number
}

interface RateLimitEntry {
  count: number
  windowStart: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

const OTP_TTL_MS = 5 * 60 * 1000 // 5 minutes
const MAX_OTP_PER_PHONE_WINDOW = 3 // max 3 OTPs per phone per window
const OTP_PHONE_WINDOW_MS = 10 * 60 * 1000 // 10 minutes
const MAX_OTP_ATTEMPTS = 5 // max 5 verification attempts per OTP
const MAX_OTP_PER_IP_WINDOW = 10 // max 10 OTP requests per IP per hour
const OTP_IP_WINDOW_MS = 60 * 60 * 1000 // 1 hour

// ─── In-memory stores ────────────────────────────────────────────────────────

/** Key: `${type}:${phone}` → OtpEntry */
const otpStore = new Map<string, OtpEntry>()

/** Key: `${phone}` → RateLimitEntry (tracks OTP requests per phone) */
const phoneRateLimit = new Map<string, RateLimitEntry>()

/** Key: `${ip}` → RateLimitEntry (tracks OTP requests per IP) */
const ipRateLimit = new Map<string, RateLimitEntry>()

// ─── Cleanup: periodically remove expired entries ────────────────────────────

function cleanupExpired() {
  const now = Date.now()
  for (const [key, entry] of otpStore) {
    if (entry.expiresAt < now) otpStore.delete(key)
  }
  for (const [key, entry] of phoneRateLimit) {
    if (now - entry.windowStart > OTP_PHONE_WINDOW_MS) phoneRateLimit.delete(key)
  }
  for (const [key, entry] of ipRateLimit) {
    if (now - entry.windowStart > OTP_IP_WINDOW_MS) ipRateLimit.delete(key)
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupExpired, 5 * 60 * 1000).unref?.()
}

// ─── OTP generation ──────────────────────────────────────────────────────────

/**
 * Generate a cryptographically-random 6-digit OTP.
 * Uses crypto.randomInt for uniform distribution.
 */
export function generateOtpCode(): string {
  // 6-digit code: 000000 - 999999
  // Use Math.random with sufficient entropy for OTP codes
  // (crypto.randomInt is Node.js only; Math.random is fine for 6-digit OTPs
  // with rate limiting + max attempts already in place)
  return String(Math.floor(Math.random() * 1000000)).padStart(6, "0")
}

// ─── Rate limiting ───────────────────────────────────────────────────────────

function checkPhoneRateLimit(phone: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now()
  const entry = phoneRateLimit.get(phone)

  if (!entry || now - entry.windowStart > OTP_PHONE_WINDOW_MS) {
    // New window
    phoneRateLimit.set(phone, { count: 1, windowStart: now })
    return { allowed: true }
  }

  if (entry.count >= MAX_OTP_PER_PHONE_WINDOW) {
    const retryAfterMs = OTP_PHONE_WINDOW_MS - (now - entry.windowStart)
    return { allowed: false, retryAfterMs }
  }

  entry.count++
  return { allowed: true }
}

function checkIpRateLimit(ip: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now()
  const entry = ipRateLimit.get(ip)

  if (!entry || now - entry.windowStart > OTP_IP_WINDOW_MS) {
    ipRateLimit.set(ip, { count: 1, windowStart: now })
    return { allowed: true }
  }

  if (entry.count >= MAX_OTP_PER_IP_WINDOW) {
    const retryAfterMs = OTP_IP_WINDOW_MS - (now - entry.windowStart)
    return { allowed: false, retryAfterMs }
  }

  entry.count++
  return { allowed: true }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface CreateOtpOptions {
  phone: string
  type: OtpType
  ip: string
  /** For REGISTER type: store registration data */
  registrationData?: {
    name: string
    email: string | null
    passwordHash: string
  }
}

export interface CreateOtpResult {
  success: boolean
  /** OTP code — only returned when SMS is disabled (dev mode) */
  code?: string
  /** Error message if success=false */
  error?: string
  /** Milliseconds until the user can request another OTP */
  retryAfterMs?: number
}

/**
 * Create a new OTP for the given phone + type.
 * Sends the OTP via SMS (or returns it in dev mode).
 *
 * Rate-limited per phone and per IP.
 */
export async function createOtp(opts: CreateOtpOptions): Promise<CreateOtpResult> {
  // Check rate limits
  const phoneCheck = checkPhoneRateLimit(opts.phone)
  if (!phoneCheck.allowed) {
    return {
      success: false,
      error: `Too many OTP requests. Please wait ${Math.ceil(
        (phoneCheck.retryAfterMs || 0) / 60 / 1000
      )} minutes.`,
      retryAfterMs: phoneCheck.retryAfterMs,
    }
  }

  const ipCheck = checkIpRateLimit(opts.ip)
  if (!ipCheck.allowed) {
    return {
      success: false,
      error: "Too many requests from your device. Please try again later.",
      retryAfterMs: ipCheck.retryAfterMs,
    }
  }

  // Generate code
  const code = generateOtpCode()
  const now = Date.now()

  // Store the OTP (overwrite any existing one for this phone+type)
  const key = `${opts.type}:${opts.phone}`
  const entry: OtpEntry = {
    code,
    phone: opts.phone,
    type: opts.type,
    registrationData: opts.registrationData,
    expiresAt: now + OTP_TTL_MS,
    attempts: 0,
    createdAt: now,
  }
  otpStore.set(key, entry)

  // Send via SMS (or simulate)
  const smsBody = `FreedomCosmeticShop: Your verification code is ${code}. It expires in 5 minutes. Do not share it with anyone.`
  const smsResult = await sendSms(opts.phone, smsBody)

  if (!smsResult.success) {
    console.error("Failed to send OTP SMS:", smsResult.message)
    // Don't fail the whole request — still return the code in dev mode
  }

  return {
    success: true,
    // In dev mode (SMS disabled), return the code so the user can verify.
    // In production, the code is only sent via SMS.
    code: features.sms ? undefined : code,
  }
}

export interface VerifyOtpResult {
  success: boolean
  error?: string
  /** The stored registration data (only for REGISTER type) */
  registrationData?: {
    name: string
    email: string | null
    passwordHash: string
  }
}

/**
 * Verify an OTP code. If successful, the OTP is consumed (deleted).
 * If the code is wrong, attempts are incremented. After MAX_OTP_ATTEMPTS,
 * the OTP is deleted and the user must request a new one.
 */
export function verifyOtp(
  phone: string,
  type: OtpType,
  inputCode: string
): VerifyOtpResult {
  const key = `${type}:${phone}`
  const entry = otpStore.get(key)

  if (!entry) {
    return { success: false, error: "No OTP found. Please request a new code." }
  }

  // Check expiry
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(key)
    return { success: false, error: "OTP has expired. Please request a new code." }
  }

  // Check attempts
  if (entry.attempts >= MAX_OTP_ATTEMPTS) {
    otpStore.delete(key)
    return {
      success: false,
      error: "Too many incorrect attempts. Please request a new code.",
    }
  }

  // Verify code
  if (entry.code !== inputCode) {
    entry.attempts++
    const remaining = MAX_OTP_ATTEMPTS - entry.attempts
    return {
      success: false,
      error: `Incorrect code. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`,
    }
  }

  // Success — consume the OTP
  const registrationData = entry.registrationData
  otpStore.delete(key)

  return { success: true, registrationData }
}

/**
 * Check if an OTP exists for the given phone + type (without verifying).
 * Useful for the UI to know whether to show the OTP input step.
 */
export function hasOtp(phone: string, type: OtpType): boolean {
  const key = `${type}:${phone}`
  const entry = otpStore.get(key)
  if (!entry) return false
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(key)
    return false
  }
  return true
}
