import { NextResponse } from 'next/server'
import { AuthError, requireRole } from '@/lib/auth'
import { smsConfiguration } from '@/lib/env'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireRole('ADMIN', 'SUPER_ADMIN')
    return NextResponse.json({
      configured: smsConfiguration.configured,
      provider: smsConfiguration.provider,
      registrationRequiresOtp: smsConfiguration.configured,
      message: smsConfiguration.configured
        ? `SMS verification is active through ${smsConfiguration.provider}.`
        : "No SMS provider configured. Registration works without OTP. Set up Pindo or Africa's Talking to enable SMS verification.",
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    const status = error instanceof AuthError ? error.statusCode : 500
    return NextResponse.json({ error: status === 403 ? 'Forbidden' : status === 401 ? 'Unauthorized' : 'Unable to check SMS status' }, { status })
  }
}
