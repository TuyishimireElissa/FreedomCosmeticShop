/**
 * POST /api/auth/forgot
 *
 * Request a password reset OTP.
 *
 * Body: { phone }
 *
 * Returns:
 *   - 200: { success: true, message: "If the phone exists, an OTP was sent.", code?: "123456" }
 *     (always returns 200 to prevent phone enumeration)
 *   - 400: { error: "..." }
 */
import { NextResponse } from "next/server"
import { forgotPassword } from "@/server/services/auth"
import { features } from '@/lib/env'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { phone } = body
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"

    if (!phone) {
      return NextResponse.json({ error: "Phone is required" }, { status: 400 })
    }

    if (!features.sms) {
      return NextResponse.json({ error: 'Password recovery is temporarily unavailable. Contact store support.' }, { status: 503 })
    }
    const result = await forgotPassword({ phone }, ip)
    if (!result.success) {
      return NextResponse.json({ error: 'Verification could not be sent. Please try again later.' }, { status: 503 })
    }

    // Always return the same success response for existing/non-existing phones.
    return NextResponse.json({
      success: true,
      message: "If an account exists for this phone, a verification code has been sent.",
      code: result.code, // only in dev mode
    })
  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    )
  }
}
