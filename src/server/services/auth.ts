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

import { db } from "@/lib/db"
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  type AuthUser,
} from "@/lib/auth"
import { normalizeRwandaPhone, PhoneValidationError } from "@/lib/phone"
import { createOtp, verifyOtp } from "@/lib/otp"
import { logLogin } from "@/server/services/activity"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RegisterInput {
  name: string
  phone: string
  email?: string
  password: string
}

export interface LoginPasswordInput {
  phone: string
  password: string
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
  }
}

/**
 * Issue access + refresh tokens for a user.
 */
async function issueTokens(user: { id: string; role: string; phone: string }): Promise<{
  accessToken: string
  refreshToken: string
}> {
  const accessToken = await signAccessToken({
    userId: user.id,
    role: user.role,
    phone: user.phone,
  })
  const refreshToken = await signRefreshToken({
    userId: user.id,
    tokenVersion: 0, // MVP: no token versioning
  })
  return { accessToken, refreshToken }
}

// ─── Registration ────────────────────────────────────────────────────────────

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

  const otpResult = verifyOtp(phone, "REGISTER", input.code)
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
  let phone: string
  try {
    phone = normalizeRwandaPhone(input.phone)
  } catch (e) {
    if (e instanceof PhoneValidationError) {
      throw new Error(e.message)
    }
    throw e
  }

  const user = await db.user.findFirst({
    where: { phone, isDeleted: false },
  })

  // Don't reveal whether the phone exists (security)
  if (!user || !user.passwordHash) {
    throw new Error("Invalid phone number or password")
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
    throw new Error("Invalid phone number or password")
  }

  // Best-effort audit log for successful login (don't await/block)
  void logLogin({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    success: true,
  }).catch(() => {})

  const tokens = await issueTokens(user)
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
    // Don't reveal whether the phone exists
    return { success: false, error: "No account found with this phone number. Please register first." }
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

  const otpResult = verifyOtp(phone, "LOGIN", input.code)
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

  const otpResult = verifyOtp(phone, "RESET", input.code)
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
  const updated = await db.user.update({
    where: { id: user.id },
    data: { passwordHash },
  })

  const tokens = await issueTokens(updated)
  return {
    user: toAuthUser(updated),
    ...tokens,
  }
}

// ─── Token refresh ───────────────────────────────────────────────────────────

/**
 * Exchange a refresh token for a new access token + refresh token.
 * The old refresh token remains valid until it expires (no rotation in MVP).
 */
export async function refreshTokens(
  refreshToken: string
): Promise<AuthResult | null> {
  const payload = await verifyRefreshToken(refreshToken)
  if (!payload) return null

  const user = await db.user.findFirst({
    where: { id: payload.userId, isDeleted: false },
  })
  if (!user) return null

  const tokens = await issueTokens(user)
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
  if (!user) return null

  return toAuthUser(user)
}
