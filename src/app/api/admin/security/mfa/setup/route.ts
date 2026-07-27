export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { MFAService } from '@/lib/mfa'
import { logActivity } from '@/server/services/activity'

export async function POST(request: Request) {
  try {
    const user = await requireRole('ADMIN', 'STAFF', 'MANAGER', 'SUPER_ADMIN')
    const setup = await MFAService.beginSetup(user.id, user.email || user.phone)
    await logActivity({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'MFA_SETUP_INITIATED',
      entityType: 'SECURITY',
      description: 'Authenticator-based MFA setup initiated',
      severity: 'warn',
      req: request,
    })
    return NextResponse.json({
      success: true,
      data: {
        ...setup,
        message: 'Scan the QR code using an authenticator app, then verify the six-digit code.',
      },
    })
  } catch (error) {
    const status = error instanceof Error && 'statusCode' in error
      ? Number((error as { statusCode: number }).statusCode)
      : 500
    console.error('MFA setup error:', error)
    return NextResponse.json({
      success: false,
      error: status === 500 ? 'Failed to initialize MFA' : (error as Error).message,
    }, { status })
  }
}
