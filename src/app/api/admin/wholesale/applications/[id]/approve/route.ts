export const dynamic = 'force-dynamic'

/** PUT /api/admin/wholesale/applications/[id]/approve — approve without invented credit or discounts */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { sendWholesaleSms } from '@/server/services/wholesale'
import { broadcastNotificationEvent } from '@/lib/realtime'
import { logActivity } from '@/server/services/activity'
import { z } from 'zod'

const ApproveSchema = z.object({
  notes: z.string().max(500).optional(),
}).strict()

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireRole('ADMIN')
    const { id } = await params
    const parsed = ApproveSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
    }

    const application = await db.wholesaleApplication.findUnique({ where: { id } })
    if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    if (application.status === 'APPROVED') return NextResponse.json({ error: 'Already approved' }, { status: 400 })

    const approvedAt = new Date()
    await db.$transaction([
      db.wholesaleApplication.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedBy: adminUser.id,
          reviewedAt: approvedAt,
          approvedAt,
          approvedBy: adminUser.id,
          approvedCreditLimit: 0,
          paymentTermsDays: 0,
          discountTier: null,
          reviewNotes: parsed.data.notes || null,
        },
      }),
      db.user.update({
        where: { id: application.userId },
        data: {
          userType: 'WHOLESALE',
          wholesaleStatus: 'APPROVED',
          wholesaleApprovedAt: approvedAt,
          wholesaleApprovedBy: adminUser.id,
          wholesaleLimit: 0,
          wholesaleDiscount: 0,
        },
      }),
    ])

    await sendWholesaleSms(application.businessPhone, 'application_approved', {
      name: application.businessName,
    })

    await db.notification.create({
      data: {
        userId: application.userId,
        type: 'PROMOTION',
        title: 'Wholesale application approved',
        body: 'Your wholesale application is approved. Product-specific wholesale prices appear when configured.',
        linkType: 'URL',
        linkUrl: '/?view=wholesale',
      },
    })
    void broadcastNotificationEvent('new', {
      id: `approval-${id}`,
      userId: application.userId,
      type: 'wholesale_approved',
      title: 'Wholesale application approved',
    }, { source: adminUser.name }).catch(() => {})

    void logActivity({
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      action: 'SETTINGS_UPDATE',
      entityType: 'CUSTOMER',
      entityId: application.userId,
      description: `Approved wholesale application for ${application.businessName} without credit or account-level discount`,
      req,
    }).catch(() => {})

    return NextResponse.json({ success: true, message: 'Application approved' })
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return NextResponse.json({ error: error.message }, { status: (error as { statusCode: number }).statusCode })
    }
    console.error('Approve error:', error)
    return NextResponse.json({ error: 'Failed to approve' }, { status: 500 })
  }
}
