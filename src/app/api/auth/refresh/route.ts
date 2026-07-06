/**
 * POST /api/auth/refresh
 *
 * Exchange a refresh token (from httpOnly cookie) for a new access token.
 *
 * No body required — reads the refresh token from the cookie.
 *
 * Returns:
 *   - 200: { user: {...}, message: "Token refreshed" }
 *   - 401: { error: "Invalid or expired refresh token" }
 */
import { NextResponse } from "next/server"
import { refreshTokens } from "@/server/services/auth"
import { getRefreshTokenFromCookies, setAuthCookies, clearAuthCookies } from "@/lib/auth"

export async function POST() {
  try {
    const refreshToken = await getRefreshTokenFromCookies()
    if (!refreshToken) {
      return NextResponse.json(
        { error: "No refresh token" },
        { status: 401 }
      )
    }

    const result = await refreshTokens(refreshToken)
    if (!result) {
      // Invalid refresh token — clear cookies
      const res = NextResponse.json(
        { error: "Invalid or expired refresh token" },
        { status: 401 }
      )
      return clearAuthCookies(res)
    }

    const res = NextResponse.json({
      user: result.user,
      message: "Token refreshed",
    })
    return setAuthCookies(res, result.accessToken, result.refreshToken)
  } catch (error) {
    console.error("Token refresh error:", error)
    return NextResponse.json(
      { error: "Token refresh failed" },
      { status: 500 }
    )
  }
}
