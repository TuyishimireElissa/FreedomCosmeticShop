/**
 * Authentication utilities: password hashing, JWT sign/verify, cookie helpers.
 *
 * Uses:
 *   - bcryptjs for password hashing (10 rounds)
 *   - jose for JWT (Edge-compatible, works in middleware)
 *
 * Token strategy:
 *   - Access token: 15 minutes, stored in httpOnly cookie "ub_access"
 *     Contains: { userId, role, phone }
 *   - Refresh token: 30 days, stored in httpOnly cookie "ub_refresh"
 *     Contains: { userId, tokenVersion }
 *
 * Cookies:
 *   - httpOnly: true (not accessible via JS — XSS protection)
 *   - secure: true in production (HTTPS only)
 *   - sameSite: "lax" (CSRF protection)
 *   - path: "/"
 */

import { SignJWT, jwtVerify } from "jose"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { resolveAuthSecret } from "@/lib/auth-secret"

const ACCESS_TOKEN_NAME = "ub_access"
const REFRESH_TOKEN_NAME = "ub_refresh"

const ACCESS_TOKEN_TTL = "15m" // 15 minutes
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60

const REFRESH_TOKEN_TTL = "30d" // 30 days
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60

// Production fails closed if neither configured secret is strong enough.
const JWT_SECRET = new TextEncoder().encode(resolveAuthSecret(
  process.env.NEXTAUTH_SECRET,
  process.env.JWT_SECRET,
  process.env.NODE_ENV,
))

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AccessTokenPayload {
  userId: string
  role: string
  phone: string
}

export interface RefreshTokenPayload {
  userId: string
  tokenVersion: number
}

export interface AuthUser {
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
  mfaEnabled?: boolean
  mustChangePassword?: boolean
}

// ─── Password hashing ────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 10

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

// ─── JWT sign / verify ───────────────────────────────────────────────────────

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .setIssuer("freedom-cosmetic-shop")
    .setAudience("freedom-cosmetic-shop")
    .sign(JWT_SECRET)
}

export async function signRefreshToken(
  payload: RefreshTokenPayload
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_TTL)
    .setIssuer("freedom-cosmetic-shop")
    .setAudience("freedom-cosmetic-shop")
    .sign(JWT_SECRET)
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: "freedom-cosmetic-shop",
      audience: "freedom-cosmetic-shop",
    })
    return payload as unknown as AccessTokenPayload
  } catch {
    return null
  }
}

export async function verifyRefreshToken(
  token: string
): Promise<RefreshTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: "freedom-cosmetic-shop",
      audience: "freedom-cosmetic-shop",
    })
    return payload as unknown as RefreshTokenPayload
  } catch {
    return null
  }
}

// ─── Cookie helpers (server-side, using next/headers) ────────────────────────

interface CookieOptions {
  httpOnly?: boolean
  secure?: boolean
  sameSite?: "strict" | "lax" | "none"
  path?: string
  maxAge?: number
}

function defaultCookieOptions(maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  }
}

/**
 * Set auth cookies on the response (for API routes).
 * Call this when issuing tokens after login/register/verify.
 */
export function setAuthCookies(
  res: NextResponse,
  accessToken: string,
  refreshToken: string
): NextResponse {
  res.cookies.set(ACCESS_TOKEN_NAME, accessToken, {
    ...defaultCookieOptions(ACCESS_TOKEN_TTL_SECONDS),
  })
  res.cookies.set(REFRESH_TOKEN_NAME, refreshToken, {
    ...defaultCookieOptions(REFRESH_TOKEN_TTL_SECONDS),
  })
  return res
}

/**
 * Clear auth cookies (for logout).
 */
export function clearAuthCookies(res: NextResponse): NextResponse {
  res.cookies.set(ACCESS_TOKEN_NAME, "", { path: "/", maxAge: 0 })
  res.cookies.set(REFRESH_TOKEN_NAME, "", { path: "/", maxAge: 0 })
  return res
}

/**
 * Read the access token from the request cookies (server-side).
 * Use this in API routes via next/headers.
 */
export async function getAccessTokenFromCookies(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(ACCESS_TOKEN_NAME)?.value
}

export async function getRefreshTokenFromCookies(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(REFRESH_TOKEN_NAME)?.value
}

/**
 * Read the access token from a NextRequest (for middleware).
 */
export function getAccessTokenFromRequest(req: NextRequest): string | undefined {
  return req.cookies.get(ACCESS_TOKEN_NAME)?.value
}

export function getRefreshTokenFromRequest(req: NextRequest): string | undefined {
  return req.cookies.get(REFRESH_TOKEN_NAME)?.value
}

export const AUTH_COOKIE_NAMES = {
  access: ACCESS_TOKEN_NAME,
  refresh: REFRESH_TOKEN_NAME,
} as const

// ─── requireAuth: use in API routes to get the authenticated user ────────────

import { db } from "@/lib/db"

/**
 * Verifies the access token from cookies and returns the user.
 *
 * Returns null if not authenticated (no token, invalid, or expired).
 * API routes should check for null and return 401 if the route is protected.
 *
 * Usage:
 *   const user = await requireAuth()
 *   if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
 */
export async function requireAuth(): Promise<AuthUser | null> {
  const token = await getAccessTokenFromCookies()
  if (!token) return null

  const payload = await verifyAccessToken(token)
  if (!payload) return null

  // Fetch the user to ensure they still exist and are active
  const user = await db.user.findFirst({
    where: {
      id: payload.userId,
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      role: true,
      loyaltyPoints: true,
      userType: true,
      wholesaleStatus: true,
      wholesaleDiscount: true,
      businessName: true,
      mfaEnabled: true,
      mustChangePassword: true,
    },
  })

  return user
}

/**
 * Like requireAuth, but throws a 401 response if not authenticated.
 * Use in protected API routes.
 *
 * Usage:
 *   const user = await requireAuthOrThrow()
 *   // ... use user.id, user.role
 */
export async function requireAuthOrThrow(): Promise<AuthUser> {
  const user = await requireAuth()
  if (!user) {
    throw new AuthError("Unauthorized", 401)
  }
  return user
}

/**
 * Require a specific role. Returns the user if they have the role,
 * otherwise throws a 403.
 *
 * Usage:
 *   const admin = await requireRole("ADMIN")
 */
export async function requireRole(
  ...allowedRoles: string[]
): Promise<AuthUser> {
  const user = await requireAuthOrThrow()
  if (!allowedRoles.includes(user.role)) {
    throw new AuthError("Forbidden: insufficient permissions", 403)
  }
  return user
}

/** Custom error class for auth errors */
export class AuthError extends Error {
  statusCode: number
  constructor(message: string, statusCode: number = 401) {
    super(message)
    this.name = "AuthError"
    this.statusCode = statusCode
  }
}
