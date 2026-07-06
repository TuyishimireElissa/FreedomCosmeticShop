/**
 * POST /api/auth/reset
 *
 * Reset password using OTP.
 *
 * Body: { phone, code, newPassword }
 *
 * Returns:
 *   - 200: { user: {...}, message: "Password reset successful" }
 *   - 400: { error: "..." }
 */
import { NextResponse } from "next/server"
import { resetPassword } from "@/server/services/auth"
import { setAuthCookies } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { phone, code, newPassword } = body

    if (!phone || !code || !newPassword) {
      return NextResponse.json(
        { error: "Phone, code, and new password are required" },
        { status: 400 }
      )
    }

    const result = await resetPassword({ phone, code, newPassword })

    const res = NextResponse.json({
      user: result.user,
      message: "Password reset successful. You are now logged in.",
    })
    return setAuthCookies(res, result.accessToken, result.refreshToken)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Password reset failed"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
