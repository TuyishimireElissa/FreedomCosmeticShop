/** POST /api/auth/logout — revoke the current token generation and clear cookies. */
import { NextResponse } from 'next/server'
import { clearAuthCookies, getRefreshTokenFromCookies, verifyRefreshToken } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST() {
  try {
    const refreshToken = await getRefreshTokenFromCookies()
    if (refreshToken) {
      const payload = await verifyRefreshToken(refreshToken)
      if (payload?.sessionId) {
        await db.authSession.updateMany({
          where: { id: payload.sessionId, userId: payload.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        })
      }
    }
  } catch (error) {
    // Cookie clearing must still succeed if the database is temporarily down.
    console.error('Session revocation failed:', error instanceof Error ? error.message : 'unknown')
  }

  return clearAuthCookies(NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  }))
}
