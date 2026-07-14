export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireRole, verifyPassword } from '@/lib/auth'
import { MFAService } from '@/lib/mfa'
import { logActivity } from '@/server/services/activity'

const schema = z.object({
  password: z.string().min(8).max(200),
  code: z.string().min(6).max(32),
})

export async function POST(request: Request) {
  try {
    const user = await requireRole('ADMIN', 'STAFF', 'MANAGER', 'SUPER_ADMIN')
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ success: false, error: 'Password and MFA code are required' }, { status: 400 })
    const account = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true, mfaSecret: true, mfaEnabled: true } })
    if (!account?.passwordHash || !account.mfaEnabled || !account.mfaSecret) return NextResponse.json({ success: false, error: 'MFA is not enabled' }, { status: 400 })
    if (!(await verifyPassword(parsed.data.password, account.passwordHash))) return NextResponse.json({ success: false, error: 'Identity verification failed' }, { status: 400 })
    const mfaValid = /^\d{6}$/.test(parsed.data.code)
      ? MFAService.verifyTOTP(parsed.data.code, account.mfaSecret)
      : await MFAService.verifyBackupCode(user.id, parsed.data.code)
    if (!mfaValid) return NextResponse.json({ success: false, error: 'Identity verification failed' }, { status: 400 })
    await MFAService.disableMFA(user.id)
    await logActivity({ userId: user.id, userName: user.name, userRole: user.role, action: 'MFA_DISABLED', entityType: 'SECURITY', description: 'MFA disabled after password and second-factor verification', severity: 'critical', req: request })
    return NextResponse.json({ success: true, message: 'MFA disabled successfully' })
  } catch (error) {
    const status = error instanceof Error && 'statusCode' in error ? Number((error as { statusCode: number }).statusCode) : 500
    console.error('MFA disable error:', error)
    return NextResponse.json({ success: false, error: status === 500 ? 'Failed to disable MFA' : (error as Error).message }, { status })
  }
}
