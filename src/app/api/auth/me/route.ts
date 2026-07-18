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

const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0' }
const privateJson = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: PRIVATE_HEADERS })

export async function GET() {
  try {
    const user = await requireAuth()
    if (!user) {
      return privateJson({ error: "Not authenticated" }, 401)
    }

    return privateJson({ user })
  } catch (error) {
    console.error("Get current user error:", error)
    return privateJson({ error: "Failed to fetch user" }, 500)
  }
}
