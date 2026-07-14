/**
 * POST /api/auth/login
 *
 * Login with phone + password.
 *
 * Body: { phone, password }
 *
 * Returns:
 *   - 200: { user: {...}, message: "Login successful" }
 *   - 400: { error: "Invalid phone number or password" }
 */
import { NextResponse } from "next/server"
import { loginWithPassword } from "@/server/services/auth"
import { setAuthCookies } from "@/lib/auth"
import { rateLimit } from "@/lib/permissions"
import { MFAService } from "@/lib/mfa"
import { AccountLockout, LOCKOUT_DURATION_MINUTES } from "@/lib/account-lockout"

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const limit = rateLimit(`login:${ip}`, { maxActions: 8, windowMs: 15 * 60 * 1000 })
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((limit.retryAfterMs || 60000) / 1000)) } },
      )
    }
    const body = await req.json()
    const identifier = body.identifier || body.phone
    const { password } = body

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Phone/email and password are required" },
        { status: 400 }
      )
    }

    const userAgent = req.headers.get('user-agent') || 'unknown'
    const lockStatus = await AccountLockout.isLocked(identifier)
    if (lockStatus.locked) {
      return NextResponse.json(
        { error: `Account temporarily locked. Try again in ${lockStatus.minutesLeft} minutes.` },
        { status: 423, headers: { 'Retry-After': String(lockStatus.minutesLeft * 60) } },
      )
    }

    let result
    try {
      result = await loginWithPassword({ identifier, password })
    } catch (authenticationError) {
      if (!(authenticationError instanceof Error) || !authenticationError.message.startsWith('Invalid')) {
        throw authenticationError
      }
      const failed = await AccountLockout.recordFailedAttempt(identifier, {
        ipAddress: ip,
        userAgent,
        reason: 'Invalid credentials',
      })
      if (failed.isLocked) {
        return NextResponse.json(
          { error: `Account temporarily locked for ${LOCKOUT_DURATION_MINUTES} minutes after repeated failed attempts.` },
          { status: 423, headers: { 'Retry-After': String(LOCKOUT_DURATION_MINUTES * 60) } },
        )
      }
      return NextResponse.json({ error: 'Invalid phone/email or password' }, { status: 400 })
    }

    await AccountLockout.resetFailedAttempts(identifier, { ipAddress: ip, userAgent })

    if (
      result.user.mfaEnabled &&
      ['ADMIN', 'STAFF', 'MANAGER', 'SUPER_ADMIN'].includes(result.user.role)
    ) {
      const challengeToken = await MFAService.createLoginChallenge(result.user.id)
      return NextResponse.json({
        success: true,
        mfaRequired: true,
        challengeToken,
        message: 'Enter your authenticator code to continue.',
      })
    }

    const res = NextResponse.json({
      user: result.user,
      message: "Login successful",
    })
    return setAuthCookies(res, result.accessToken, result.refreshToken)
  } catch (error) {
    console.error("Login failed:", error)
    const message =
      error instanceof Error &&
      (error.message.startsWith("Invalid") || error.message.includes("required"))
        ? error.message
        : "Login is temporarily unavailable. Please try again."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
