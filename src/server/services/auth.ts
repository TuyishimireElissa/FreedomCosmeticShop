/**
 * Auth service — business logic for registration, login, OTP, password reset.
 *
 * This is the "controller + service" layer. API routes call these functions
 * and return the results as JSON.
 *
 * Functions:
 *   - startRegistration  → creates pending OTP + sends SMS
 *   - verifyRegistration → verifies OTP, creates User, returns tokens
 *   - loginWithPassword  → phone + password → tokens
 *   - startOtpLogin      → sends OTP for passwordless login
 *   - verifyOtpLogin     → verifies OTP → tokens
 *   - forgotPassword     → sends OTP for password reset
 *   - resetPassword      → verifies OTP + sets new password
 *   - refreshTokens      → exchange refresh token for new access token
 *   - getCurrentUser     → fetch user from access token
 *
 * Token issuance:
 *   - Access token (15 min) + refresh token (30 days) set as httpOnly cookies
 *   - Returns the user object (without passwordHash)
 */

import { createHash, randomUUID } from 'node:crypto'
import { db } from "@/lib/db"
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  SESSION_REFRESH_TOKEN_TTL_SECONDS,
  REMEMBERED_REFRESH_TOKEN_TTL_SECONDS,
  type AuthUser,
} from "@/lib/auth"
import { normalizeRwandaPhone, PhoneValidationError } from "@/lib/phone"
import { createOtp, verifyOtp } from "@/lib/otp"
import { logLogin } from "@/server/services/activity"
import { features } from '@/lib/env'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RegisterInput {
  name: string
  phone: string
  email?: string
  password: string
}

export interface LoginPasswordInput {
  phone?: string
  identifier?: string
  password: string
  rememberDevice?: boolean
}

export interface OtpLoginInput {
  phone: string
}

export interface VerifyOtpInput {
  phone: string
  code: string
}

export interface ResetPasswordInput {
  phone: string
  code: string
  newPassword: string
}

export interface AuthResult {
  user: AuthUser
  accessToken: string
  refreshToken: string
  rememberDevice: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Convert a DB User to a safe AuthUser (no passwordHash).
 */
function toAuthUser(user: {
  id: string
  name: string
  phone: string
  email: string | null
  role: string
  loyaltyPoints?: number
  userType?: string
  wholesaleStatus?: string | null
  wholesaleDiscount?: number
  businessName?: string | null
  assignedManagerName?: string | null
  assignedManagerPhone?: string | null
  assignedManagerWhatsApp?: string | null
  preferredDeliveryDays?: string[]
  mfaEnabled?: boolean
  mustChangePassword?: boolean
}): AuthUser {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    loyaltyPoints: user.loyaltyPoints,
    userType: user.userType,
    wholesaleStatus: user.wholesaleStatus,
    wholesaleDiscount: user.wholesaleDiscount,
    businessName: user.businessName,
    assignedManagerName: user.assignedManagerName,
    assignedManagerPhone: user.assignedManagerPhone,
    assignedManagerWhatsApp: user.assignedManagerWhatsApp,
    preferredDeliveryDays: user.preferredDeliveryDays,
    mfaEnabled: user.mfaEnabled,
    mustChangePassword: user.mustChangePassword,
  }
}

/**
 * Issue access + refresh tokens for a user.
 */
function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

async function issueTokens(
  user: { id: string; role: string; phone: string; sessionVersion: number },
  rememberDevice = false,
  rotation?: { sessionId: string; currentTokenHash: string },
): Promise<{ accessToken: string; refreshToken: string; rememberDevice: boolean }> {
  const sessionId = rotation?.sessionId || randomUUID()
  const ttlSeconds = rememberDevice ? REMEMBERED_REFRESH_TOKEN_TTL_SECONDS : SESSION_REFRESH_TOKEN_TTL_SECONDS
  const accessToken = await signAccessToken({ userId: user.id, role: user.role, phone: user.phone, sessionVersion: user.sessionVersion, sessionId })
  const refreshToken = await signRefreshToken({ userId: user.id, sessionVersion: user.sessionVersion, sessionId, rememberDevice }, ttlSeconds)
  const nextHash = tokenHash(refreshToken)
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000)
  if (rotation) {
    const updated = await db.authSession.updateMany({
      where: { id: sessionId, userId: user.id, tokenHash: rotation.currentTokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
      data: { tokenHash: nextHash, rememberDevice, expiresAt, lastUsedAt: new Date() },
    })
    if (updated.count !== 1) throw new Error('Refresh session was already used or revoked')
  } else {
    await db.authSession.create({ data: { id: sessionId, userId: user.id, tokenHash: nextHash, rememberDevice, expiresAt } })
    void db.authSession.deleteMany({ where: { userId: user.id, OR: [{ expiresAt: { lte: new Date() } }, { revokedAt: { not: null } }] } }).catch(() => {})
  }
  return { accessToken, refreshToken, rememberDevice }
}

export async function completeMfaLogin(userId: string, rememberDevice = false): Promise<AuthResult> {
  const user = await db.user.findFirst({ where: { id: userId, isDeleted: false } })
  if (!user) throw new Error('User not found')
  const tokens = await issueTokens(user, rememberDevice)
  return { user: toAuthUser(user), ...tokens }
}

// ─── Registration ────────────────────────────────────────────────────────────

/** Password registration fallback used only while production SMS is disabled. */
export async function registerWithoutOtp(input: RegisterInput): Promise<AuthResult> {
  if (features.sms) throw new Error('Direct registration is disabled while SMS verification is available')
  if (!input.name || input.name.trim().length < 2) throw new Error('Name must be at least 2 characters')
  if (!input.password || input.password.length < 8) throw new Error('Password must be at least 8 characters')
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) throw new Error('Invalid email format')

  let phone: string
  try { phone = normalizeRwandaPhone(input.phone) }
  catch { throw new Error('Invalid Rwanda phone number') }

  const existing = await db.user.findFirst({
    where: { OR: [{ phone }, ...(input.email ? [{ email: input.email.trim().toLowerCase() }] : [])], isDeleted: false },
    select: { phone: true, email: true },
  })
  if (existing?.phone === phone) throw new Error('This phone number is already registered. Try logging in.')
  if (existing?.email && input.email) throw new Error('This email address is already registered. Try logging in.')

  const user = await db.user.create({
    data: {
      name: input.name.trim(),
      phone,
      email: input.email?.trim().toLowerCase() || null,
      // Email is optional and is not marked verified without an email proof flow.
      emailVerifiedAt: null,
      passwordHash: await hashPassword(input.password),
      role: 'CUSTOMER',
      failedLoginCount: 0,
      lockedUntil: null,
      isDeleted: false,
      isTestAccount: false,
    },
  })
  const tokens = await issueTokens(user)
  return { user: toAuthUser(user), ...tokens }
}

/**
 * Step 1: Start registration.
 * Validates input, checks phone isn't already registered, hashes password,
 * creates an OTP (with registration data attached), sends SMS.
 *
 * Returns the OTP code in dev mode (when SMS is disabled).
 */
export async function startRegistration(
  input: RegisterInput,
  ip: string
): Promise<{ success: boolean; code?: string; error?: string }> {
  // Validate input
  if (!input.name || input.name.trim().length < 2) {
    return { success: false, error: "Name must be at least 2 characters" }
  }
  if (!input.password || input.password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" }
  }
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    return { success: false, error: "Invalid email format" }
  }

  // Normalize phone
  let phone: string
  try {
    phone = normalizeRwandaPhone(input.phone)
  } catch (e) {
    if (e instanceof PhoneValidationError) {
      return { success: false, error: e.message }
    }
    throw e
  }

  // Check if phone is already registered
  const existing = await db.user.findUnique({ where: { phone } })
  if (existing && !existing.isDeleted) {
    return { success: false, error: "This phone number is already registered. Try logging in." }
  }

  // Hash password
  const passwordHash = await hashPassword(input.password)

  // Create OTP with registration data
  const otpResult = await createOtp({
    phone,
    type: "REGISTER",
    ip,
    registrationData: {
      name: input.name.trim(),
      email: input.email?.trim() || null,
      passwordHash,
    },
  })

  if (!otpResult.success) {
    return { success: false, error: otpResult.error }
  }

  return { success: true, code: otpResult.code }
}

/**
 * Step 2: Verify registration OTP.
 * Verifies the OTP, creates the User, issues tokens.
 */
export async function verifyRegistration(
  input: VerifyOtpInput
): Promise<AuthResult> {
  let phone: string
  try {
    phone = normalizeRwandaPhone(input.phone)
  } catch (e) {
    if (e instanceof PhoneValidationError) {
      throw new Error(e.message)
    }
    throw e
  }

  const otpResult = await verifyOtp(phone, "REGISTER", input.code)
  if (!otpResult.success) {
    throw new Error(otpResult.error || "OTP verification failed")
  }
  if (!otpResult.registrationData) {
    throw new Error("Registration data missing from OTP")
  }

  // Double-check phone isn't taken (race condition safety)
  const existing = await db.user.findUnique({ where: { phone } })
  if (existing && !existing.isDeleted) {
    throw new Error("This phone number is already registered")
  }

  // Create the user
  const user = await db.user.create({
    data: {
      name: otpResult.registrationData.name,
      phone,
      email: otpResult.registrationData.email,
      passwordHash: otpResult.registrationData.passwordHash,
      role: "CUSTOMER",
    },
  })

  // Issue tokens
  const tokens = await issueTokens(user)
  return {
    user: toAuthUser(user),
    ...tokens,
  }
}

// ─── Login with password ─────────────────────────────────────────────────────

export async function loginWithPassword(
  input: LoginPasswordInput
): Promise<AuthResult> {
  const identifier = (input.identifier || input.phone || "").trim()
  if (!identifier) throw new Error("Phone or email is required")

  let user
  if (identifier.includes("@")) {
    user = await db.user.findFirst({
      where: { email: identifier.toLowerCase(), isDeleted: false },
    })
  } else {
    let phone: string
    try {
      phone = normalizeRwandaPhone(identifier)
    } catch (e) {
      if (e instanceof PhoneValidationError) {
        throw new Error("Invalid phone/email or password")
      }
      throw e
    }
    user = await db.user.findFirst({ where: { phone, isDeleted: false } })
  }

  // Don't reveal whether the account exists (security)
  if (!user || !user.passwordHash) {
    throw new Error("Invalid phone/email or password")
  }

  const passwordValid = await verifyPassword(input.password, user.passwordHash)
  if (!passwordValid) {
    // Best-effort audit log for failed login (don't await/block)
    void logLogin({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      success: false,
    }).catch(() => {})
    throw new Error("Invalid phone/email or password")
  }

  // Best-effort audit log for successful login (don't await/block)
  void logLogin({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    success: true,
  }).catch(() => {})

  const tokens = await issueTokens(user, Boolean(input.rememberDevice))
  return {
    user: toAuthUser(user),
    ...tokens,
  }
}

// ─── OTP login (passwordless) ────────────────────────────────────────────────

export async function startOtpLogin(
  input: OtpLoginInput,
  ip: string
): Promise<{ success: boolean; code?: string; error?: string }> {
  let phone: string
  try {
    phone = normalizeRwandaPhone(input.phone)
  } catch (e) {
    if (e instanceof PhoneValidationError) {
      return { success: false, error: e.message }
    }
    throw e
  }

  // Check if user exists
  const user = await db.user.findFirst({
    where: { phone, isDeleted: false },
  })
  if (!user) {
    // Return the same shape as a successful request to prevent account enumeration.
    return { success: true }
  }

  const otpResult = await createOtp({ phone, type: "LOGIN", ip })
  if (!otpResult.success) {
    return { success: false, error: otpResult.error }
  }

  return { success: true, code: otpResult.code }
}

export async function verifyOtpLogin(input: VerifyOtpInput): Promise<AuthResult> {
  let phone: string
  try {
    phone = normalizeRwandaPhone(input.phone)
  } catch (e) {
    if (e instanceof PhoneValidationError) {
      throw new Error(e.message)
    }
    throw e
  }

  const otpResult = await verifyOtp(phone, "LOGIN", input.code)
  if (!otpResult.success) {
    throw new Error(otpResult.error || "OTP verification failed")
  }

  const user = await db.user.findFirst({
    where: { phone, isDeleted: false },
  })
  if (!user) {
    throw new Error("Account not found")
  }

  const tokens = await issueTokens(user)
  return {
    user: toAuthUser(user),
    ...tokens,
  }
}

// ─── Password reset ──────────────────────────────────────────────────────────

export async function forgotPassword(
  input: OtpLoginInput,
  ip: string
): Promise<{ success: boolean; code?: string; error?: string }> {
  let phone: string
  try {
    phone = normalizeRwandaPhone(input.phone)
  } catch (e) {
    if (e instanceof PhoneValidationError) {
      return { success: false, error: e.message }
    }
    throw e
  }

  // Check if user exists (don't reveal if not — security)
  const user = await db.user.findFirst({
    where: { phone, isDeleted: false },
  })

  if (!user) {
    // For security, return success even if the user doesn't exist
    // (prevents phone enumeration)
    return { success: true }
  }

  const otpResult = await createOtp({ phone, type: "RESET", ip })
  if (!otpResult.success) {
    return { success: false, error: otpResult.error }
  }

  return { success: true, code: otpResult.code }
}

export async function resetPassword(input: ResetPasswordInput): Promise<AuthResult> {
  if (!input.newPassword || input.newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters")
  }

  let phone: string
  try {
    phone = normalizeRwandaPhone(input.phone)
  } catch (e) {
    if (e instanceof PhoneValidationError) {
      throw new Error(e.message)
    }
    throw e
  }

  const otpResult = await verifyOtp(phone, "RESET", input.code)
  if (!otpResult.success) {
    throw new Error(otpResult.error || "OTP verification failed")
  }

  const user = await db.user.findFirst({
    where: { phone, isDeleted: false },
  })
  if (!user) {
    throw new Error("Account not found")
  }

  // Set new password
  const passwordHash = await hashPassword(input.newPassword)
  const updated = await db.$transaction(async (tx) => {
    const account = await tx.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordChangedAt: new Date(), failedLoginCount: 0, lockedUntil: null, sessionVersion: { increment: 1 } },
    })
    await tx.authSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } })
    return account
  })

  const tokens = await issueTokens(updated)
  return {
    user: toAuthUser(updated),
    ...tokens,
  }
}

// ─── Token refresh ───────────────────────────────────────────────────────────

/** Exchange and rotate a single-use refresh token. */
export async function refreshTokens(
  refreshToken: string
): Promise<AuthResult | null> {
  const payload = await verifyRefreshToken(refreshToken)
  if (!payload || typeof payload.sessionVersion !== 'number' || !payload.sessionId) return null

  const current = await db.user.findFirst({ where: { id: payload.userId, isDeleted: false } })
  if (!current || current.sessionVersion !== payload.sessionVersion) return null
  if (current.passwordChangedAt && (!payload.iat || payload.iat * 1000 < current.passwordChangedAt.getTime())) return null
  const currentHash = tokenHash(refreshToken)
  const session = await db.authSession.findFirst({
    where: { id: payload.sessionId, userId: current.id, tokenHash: currentHash, revokedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true },
  })
  if (!session) return null

  // Atomic token-hash replacement makes the presented refresh token single-use
  // without revoking independent sessions on the user's other devices.
  const user = current
  const tokens = await issueTokens(user, payload.rememberDevice === true, { sessionId: session.id, currentTokenHash: currentHash })
  return {
    user: toAuthUser(user),
    ...tokens,
  }
}

// ─── Get current user ────────────────────────────────────────────────────────

export async function getUserFromAccessToken(
  accessToken: string
): Promise<AuthUser | null> {
  const payload = await verifyAccessToken(accessToken)
  if (!payload) return null

  const user = await db.user.findFirst({
    where: { id: payload.userId, isDeleted: false },
  })
  if (!user || !payload.sessionId || payload.sessionVersion !== user.sessionVersion) return null
  if (user.passwordChangedAt && (!payload.iat || payload.iat * 1000 < user.passwordChangedAt.getTime())) return null
  const session = await db.authSession.findFirst({ where: { id: payload.sessionId, userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } })
  if (!session) return null

  return toAuthUser(user)
}
