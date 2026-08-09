export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/orders/[id]/timeline
 *
 * There is no status-history table in this schema — nothing records when an
 * order moved between states. The timeline is therefore assembled from the two
 * sources that genuinely exist:
 *
 *   1. Real timestamp columns (Order.createdAt, whatsappSentAt,
 *      paymentReceivedAt, Delivery.assignedAt/pickedUpAt/deliveredAt)
 *   2. ActivityLog rows for this order, which carry the acting admin's name
 *
 * No event is inferred and no date is estimated. An order predating the audit
 * log simply shows fewer entries — that is the honest answer, and the UI says
 * so rather than inventing a history.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthError } from '@/lib/auth'
import { PERMISSIONS, requirePermission } from '@/lib/permissions'

const headers = { 'Cache-Control': 'private, no-store, max-age=0' }

interface TimelineEntry {
  at: string
  kind: 'created' | 'whatsapp' | 'payment' | 'delivery' | 'activity'
  label: string
  detail?: string
  actor?: string
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission(PERMISSIONS.ORDERS_READ)
    const { id } = await params

    const order = await prisma.order.findFirst({
      where: { OR: [{ id }, { orderNumber: id }] },
      select: {
        id: true, orderNumber: true, status: true, createdAt: true,
        whatsappSentAt: true, whatsappConfirmedAt: true, paymentReceivedAt: true,
        paymentMethod: true, adminNotes: true,
        delivery: { select: { assignedAt: true, pickedUpAt: true, deliveredAt: true, driverName: true } },
        payments: { select: { method: true, status: true, amount: true, completedAt: true } },
      },
    })
    if (!order) return NextResponse.json({ success: false, error: 'ORDER_NOT_FOUND' }, { status: 404, headers })

    const entries: TimelineEntry[] = []
    const push = (at: Date | null | undefined, kind: TimelineEntry['kind'], label: string, detail?: string, actor?: string) => {
      if (at) entries.push({ at: at.toISOString(), kind, label, detail, actor })
    }

    push(order.createdAt, 'created', 'order_created')
    push(order.whatsappSentAt, 'whatsapp', 'whatsapp_sent')
    push(order.whatsappConfirmedAt, 'whatsapp', 'whatsapp_confirmed')
    push(order.paymentReceivedAt, 'payment', 'payment_received', order.paymentMethod || undefined)
    push(order.delivery?.assignedAt, 'delivery', 'delivery_assigned', order.delivery?.driverName || undefined)
    push(order.delivery?.pickedUpAt, 'delivery', 'delivery_picked_up')
    push(order.delivery?.deliveredAt, 'delivery', 'delivery_delivered')

    // Audit rows carry who did what. Bounded so a noisy order cannot return an
    // unbounded payload.
    const activity = await prisma.activityLog.findMany({
      where: { entityType: 'ORDER', entityId: order.id },
      orderBy: { createdAt: 'asc' },
      take: 100,
      select: { action: true, description: true, userName: true, createdAt: true },
    })
    for (const row of activity) {
      push(row.createdAt, 'activity', row.action, row.description || undefined, row.userName || undefined)
    }

    entries.sort((a, b) => a.at.localeCompare(b.at))

    return NextResponse.json(
      {
        success: true,
        data: {
          orderNumber: order.orderNumber,
          status: order.status,
          adminNotes: order.adminNotes,
          payments: order.payments,
          entries,
          // The UI uses this to explain a short timeline instead of implying
          // nothing happened.
          hasAuditTrail: activity.length > 0,
        },
      },
      { headers },
    )
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode, headers })
    }
    console.error('[whatsapp-orders] timeline failed', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ success: false, error: 'TIMELINE_FAILED' }, { status: 500, headers })
  }
}
