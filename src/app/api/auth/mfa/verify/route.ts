export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { MFAService } from '@/lib/mfa'
import { setAuthCookies } from '@/lib/auth'
import { completeMfaLogin } from '@/server/services/auth'
import { logActivity } from '@/server/services/activity'

const schema = z.object({
  challengeToken: z.string().min(20),
  code: z.string().min(6).max(32),
})

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ success: false, error: 'MFA challenge and code are required' }, { status: 400 })
    const userId = await MFAService.verifyLoginChallenge(parsed.data.challengeToken, parsed.data.code)
    if (!userId) return NextResponse.json({ success: false, error: 'Invalid or expired verification code' }, { status: 400 })
    const result = await completeMfaLogin(userId)
    await logActivity({ userId: result.user.id, userName: result.user.name, userRole: result.user.role, action: 'MFA_LOGIN_SUCCESS', entityType: 'AUTH', description: 'Admin login completed with MFA', req: request })
    const response = NextResponse.json({ success: true, user: result.user, message: 'Login successful' })
    return setAuthCookies(response, result.accessToken, result.refreshToken)
  } catch (error) {
    console.error('MFA login verification error:', error)
    return NextResponse.json({ success: false, error: 'Invalid or expired MFA challenge' }, { status: 400 })
  }
}
