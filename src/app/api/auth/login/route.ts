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
    const { phone, password } = body

    if (!phone || !password) {
      return NextResponse.json(
        { error: "Phone and password are required" },
        { status: 400 }
      )
    }

    const result = await loginWithPassword({ phone, password })

    const res = NextResponse.json({
      user: result.user,
      message: "Login successful",
    })
    return setAuthCookies(res, result.accessToken, result.refreshToken)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
