/**
 * POST /api/auth/logout
 *
 * Clears auth cookies (access + refresh tokens).
 * The client should also clear its local user state.
 *
 * Returns:
 *   - 200: { success: true, message: "Logged out" }
 */
import { NextResponse } from "next/server"
import { clearAuthCookies } from "@/lib/auth"

export async function POST() {
  const res = NextResponse.json({
    success: true,
    message: "Logged out successfully",
  })
  return clearAuthCookies(res)
}
