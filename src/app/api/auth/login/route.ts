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

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const identifier = body.identifier || body.phone
    const { password } = body

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Phone/email and password are required" },
        { status: 400 }
      )
    }

    const result = await loginWithPassword({ identifier, password })

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
