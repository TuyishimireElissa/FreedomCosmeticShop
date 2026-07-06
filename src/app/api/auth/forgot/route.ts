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

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { phone } = body
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"

    if (!phone) {
      return NextResponse.json({ error: "Phone is required" }, { status: 400 })
    }

    const result = await forgotPassword({ phone }, ip)

    // Always return success (prevent phone enumeration)
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
