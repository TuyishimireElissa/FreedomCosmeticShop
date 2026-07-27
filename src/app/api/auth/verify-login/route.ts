/**
 * POST /api/auth/verify-login
 *
 * Two purposes (based on body):
 *   1. { phone } only → sends OTP for passwordless login
 *   2. { phone, code } → verifies OTP and logs in
 *
 * Returns for purpose 1:
 *   - 200: { success: true, message: "OTP sent", code?: "123456" }
 *   - 400: { error: "..." }
 *
 * Returns for purpose 2:
 *   - 200: { user: {...}, message: "Login successful" }
 *   - 400: { error: "..." }
 */
import { NextResponse } from "next/server"
import { startOtpLogin, verifyOtpLogin } from "@/server/services/auth"
import { setAuthCookies } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { phone, code } = body
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"

    if (!phone) {
      return NextResponse.json(
        { error: "Phone is required" },
        { status: 400 }
      )
    }

    // Purpose 2: verify OTP
    if (code) {
      const result = await verifyOtpLogin({ phone, code })
      const res = NextResponse.json({
        user: result.user,
        message: "Login successful",
      })
      return setAuthCookies(res, result.accessToken, result.refreshToken)
    }

    // Purpose 1: send OTP
    const result = await startOtpLogin({ phone }, ip)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent to your phone.",
      code: result.code, // only in dev mode
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
