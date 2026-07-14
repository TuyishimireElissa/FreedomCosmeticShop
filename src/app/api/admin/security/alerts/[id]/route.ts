export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { logActivity } from '@/server/services/activity'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const actor = await requireRole('ADMIN', 'SUPER_ADMIN')
    const alert = await prisma.securityAlert.findUnique({ where: { id: params.id } })
    if (!alert) {
      return NextResponse.json({ success: false, error: 'Security alert not found' }, { status: 404 })
    }
    if (alert.isResolved) {
      return NextResponse.json({ success: false, error: 'Security alert is already resolved' }, { status: 409 })
    }

    const resolvedAt = new Date()
    const result = await prisma.securityAlert.updateMany({
      where: { id: alert.id, isResolved: false },
      data: { isResolved: true, resolvedAt, resolvedBy: actor.id },
    })
    if (result.count !== 1) {
      return NextResponse.json({ success: false, error: 'Security alert was already updated' }, { status: 409 })
    }

    await logActivity({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: 'SECURITY_ALERT_RESOLVED',
      entityType: 'SECURITY_ALERT',
      entityId: alert.id,
      description: `Resolved ${alert.severity} security alert: ${alert.type}`,
      severity: 'critical',
      req: request,
    })

    return NextResponse.json({
      success: true,
      data: { id: alert.id, isResolved: true, resolvedAt, resolvedBy: actor.id },
    })
  } catch (error) {
    const status = error instanceof Error && 'statusCode' in error
      ? Number((error as { statusCode: number }).statusCode)
      : 500
    console.error('Security alert resolution error:', error)
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Failed to resolve security alert' : (error as Error).message },
      { status },
    )
  }
}
