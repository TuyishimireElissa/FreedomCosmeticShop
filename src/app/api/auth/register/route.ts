/** POST /api/auth/register — OTP registration, with password fallback while SMS is disabled. */
import { NextResponse } from 'next/server'
import { registerWithoutOtp, startRegistration } from '@/server/services/auth'
import { setAuthCookies } from '@/lib/auth'
import { features } from '@/lib/env'
import { rateLimit } from '@/lib/permissions'

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const limit = rateLimit(`registration:${ip}`, { maxActions: 5, windowMs: 60 * 60_000 })
    if (!limit.allowed) return NextResponse.json({ error: 'Too many registration attempts. Please try again later.' }, { status: 429 })
    const body = await req.json()

    if (!features.sms) {
      const result = await registerWithoutOtp(body)
      const response = NextResponse.json({ success: true, verificationRequired: false, user: result.user, message: 'Registration successful.' }, { status: 201 })
      return setAuthCookies(response, result.accessToken, result.refreshToken)
    }

    const result = await startRegistration(body, ip)
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ success: true, verificationRequired: true, message: 'Verification code sent to your phone.' })
  } catch (error) {
    console.error('Registration error:', error)
    const message = error instanceof Error && (error.message.startsWith('Invalid') || error.message.includes('already registered') || error.message.includes('at least'))
      ? error.message
      : 'Registration failed. Please try again.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
