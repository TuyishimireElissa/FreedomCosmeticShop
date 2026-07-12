export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/me
 *
 * Returns the current authenticated user (from access token cookie).
 * If the access token is expired, the client should call /api/auth/refresh
 * first, then retry this endpoint.
 *
 * Returns:
 *   - 200: { user: {...} }
 *   - 401: { error: "Not authenticated" }
 */
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"

export async function GET() {
  try {
    const user = await requireAuth()
    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Get current user error:", error)
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    )
  }
}
