/**
 * POST /api/auth/register
 *
 * Step 1 of registration: validates input, checks phone availability,
 * hashes password, creates OTP, sends SMS.
 *
 * Body: { name, phone, email?, password }
 *
 * Returns:
 *   - 200: { success: true, message: "OTP sent", code?: "123456" }
 *     (code only returned in dev mode when SMS is disabled)
 *   - 400: { error: "..." }
 *   - 429: { error: "Too many requests", retryAfter: 600 }
 */
import { NextResponse } from "next/server"
import { startRegistration } from "@/server/services/auth"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"

    const result = await startRegistration(body, ip)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent to your phone.",
      code: result.code, // only present in dev mode
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    )
  }
}
