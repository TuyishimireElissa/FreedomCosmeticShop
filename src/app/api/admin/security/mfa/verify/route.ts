export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole } from '@/lib/auth'
import { MFAService } from '@/lib/mfa'
import { logActivity } from '@/server/services/activity'

const schema = z.object({ token: z.string().regex(/^\d{6}$/) })

export async function POST(request: Request) {
  try {
    const user = await requireRole('ADMIN', 'STAFF', 'MANAGER', 'SUPER_ADMIN')
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Enter a valid six-digit code' }, { status: 400 })
    }
    if (!(await MFAService.confirmSetup(user.id, parsed.data.token))) {
      await logActivity({ userId: user.id, userName: user.name, userRole: user.role, action: 'MFA_ENABLE_FAILED', entityType: 'SECURITY', severity: 'warn', req: request })
      return NextResponse.json({ success: false, error: 'Invalid authenticator code' }, { status: 400 })
    }
    await logActivity({ userId: user.id, userName: user.name, userRole: user.role, action: 'MFA_ENABLED', entityType: 'SECURITY', description: 'Authenticator-based MFA enabled', severity: 'info', req: request })
    return NextResponse.json({ success: true, message: 'MFA enabled successfully' })
  } catch (error) {
    const status = error instanceof Error && 'statusCode' in error ? Number((error as { statusCode: number }).statusCode) : 500
    console.error('MFA verification error:', error)
    return NextResponse.json({ success: false, error: status === 500 ? 'Failed to verify MFA' : (error as Error).message }, { status })
  }
}
