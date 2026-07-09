/**
 * POST /api/auth/verify
 *
 * Step 2 of registration: verifies the OTP, creates the User,
 * sets auth cookies (access + refresh tokens).
 *
 * Body: { phone, code }
 *
 * Returns:
 *   - 200: { user: {...}, message: "Registration complete" }
 *   - 400: { error: "..." }
 */
import { NextResponse } from "next/server"
import { verifyRegistration } from "@/server/services/auth"
import { setAuthCookies } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { phone, code } = body

    if (!phone || !code) {
      return NextResponse.json(
        { error: "Phone and code are required" },
        { status: 400 }
      )
    }

    const result = await verifyRegistration({ phone, code })

    // Set auth cookies
    const res = NextResponse.json({
      user: result.user,
      message: "Registration complete! Welcome to FreedomCosmeticShop.",
    })
    return setAuthCookies(res, result.accessToken, result.refreshToken)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Verification failed"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
