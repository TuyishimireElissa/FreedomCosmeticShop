export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { normalizeRwandaPhone } from '@/lib/phone'
import { requirePermission, PERMISSIONS, rateLimit } from '@/lib/permissions'
import { broadcastDeliveryEvent, broadcastOrderEvent } from '@/lib/realtime'
import { logActivity } from '@/server/services/activity'

const statuses = ['PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED'] as const
const transitions: Record<string, readonly string[]> = {
  PENDING: ['ASSIGNED', 'FAILED'],
  ASSIGNED: ['PICKED_UP', 'FAILED'],
  PICKED_UP: ['IN_TRANSIT', 'FAILED'],
  IN_TRANSIT: ['DELIVERED', 'FAILED'],
  DELIVERED: [],
  FAILED: ['PENDING'],
}
const schema = z.object({
  driverName: z.string().trim().min(2).max(100).optional().nullable(),
  driverPhone: z.string().min(9).max(20).optional().nullable(),
  vehiclePlate: z.string().trim().max(30).optional().nullable(),
  status: z.enum(statuses).optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
  failureReason: z.string().trim().max(500).optional().nullable(),
  trackingCode: z.string().trim().max(100).optional().nullable(),
}).strict().refine((value) => Object.values(value).some((item) => item !== undefined), 'At least one field is required')

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requirePermission(PERMISSIONS.DELIVERIES_UPDATE)
    const limit = rateLimit(`admin:${admin.id}:delivery-update`, { maxActions: 60, windowMs: 60_000 })
    if (!limit.allowed) return NextResponse.json({ error: 'Rate limited. Too many delivery updates.' }, { status: 429 })

    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Invalid update', details: parsed.error.flatten() }, { status: 400 })
    const { id } = await params
    const existing = await db.delivery.findUnique({ where: { id }, include: { order: { include: { payments: true } } } })
    if (!existing) return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })
    if (['CANCELLED', 'RETURNED'].includes(existing.order.status) && parsed.data.status !== 'FAILED') {
      return NextResponse.json({ error: `Delivery cannot advance for a ${existing.order.status.toLowerCase()} order` }, { status: 409 })
    }
    if (parsed.data.status && parsed.data.status !== existing.status && !(transitions[existing.status] || []).includes(parsed.data.status)) {
      return NextResponse.json({ error: `Invalid delivery transition: ${existing.status} → ${parsed.data.status}` }, { status: 409 })
    }
    if (parsed.data.status === 'FAILED' && !parsed.data.failureReason?.trim()) {
      return NextResponse.json({ error: 'Failure reason is required' }, { status: 400 })
    }

    let driverPhone = parsed.data.driverPhone
    if (driverPhone) {
      try { driverPhone = normalizeRwandaPhone(driverPhone) }
      catch { return NextResponse.json({ error: 'Invalid Rwanda rider phone' }, { status: 400 }) }
    }
    const nextDriverName = parsed.data.driverName === undefined ? existing.driverName : parsed.data.driverName
    const nextDriverPhone = driverPhone === undefined ? existing.driverPhone : driverPhone
    if (parsed.data.status === 'ASSIGNED' && (!nextDriverName || !nextDriverPhone)) {
      return NextResponse.json({ error: 'Rider name and phone are required for assignment' }, { status: 400 })
    }

    const primaryPayment = existing.order.payments[0]
    if (parsed.data.status === 'DELIVERED' && primaryPayment && primaryPayment.method !== 'COD' && primaryPayment.status !== 'PAID') {
      return NextResponse.json({ error: 'Online-payment delivery cannot be completed before verified payment' }, { status: 409 })
    }

    const now = new Date()
    const data: Record<string, unknown> = { ...parsed.data, ...(parsed.data.driverPhone !== undefined ? { driverPhone } : {}) }
    if (parsed.data.status === 'ASSIGNED' && !existing.assignedAt) data.assignedAt = now
    if (parsed.data.status === 'PICKED_UP' && !existing.pickedUpAt) data.pickedUpAt = now
    if (parsed.data.status === 'DELIVERED') { data.deliveredAt = now; data.actualArrival = now }
    if (parsed.data.status === 'PENDING') {
      data.failureReason = null
      data.deliveredAt = null
      data.actualArrival = null
      data.pickedUpAt = null
    }

    const updated = await db.$transaction(async (tx) => {
      const delivery = await tx.delivery.update({ where: { id }, data, include: { order: true } })
      if (parsed.data.status === 'ASSIGNED' && existing.order.status === 'CONFIRMED') {
        await tx.order.update({ where: { id: existing.orderId }, data: { status: 'PROCESSING' } })
      }
      if (['PICKED_UP', 'IN_TRANSIT'].includes(parsed.data.status || '') && ['CONFIRMED', 'PROCESSING'].includes(existing.order.status)) {
        await tx.order.update({ where: { id: existing.orderId }, data: { status: 'SHIPPED' } })
      }
      if (parsed.data.status === 'DELIVERED') {
        await tx.order.update({ where: { id: existing.orderId }, data: { status: 'DELIVERED' } })
        if (primaryPayment?.method === 'COD' && primaryPayment.status === 'PENDING') {
          await tx.payment.update({ where: { id: primaryPayment.id }, data: { status: 'PAID', completedAt: now } })
        }
      }
      return delivery
    })

    const assigned = Boolean(parsed.data.status === 'ASSIGNED' && nextDriverName && !existing.driverName)
    await broadcastDeliveryEvent(assigned ? 'assigned' : 'updated', {
      orderId: updated.orderId,
      orderNumber: existing.order.orderNumber,
      userId: existing.order.userId,
      riderName: updated.driverName || undefined,
      riderPhone: updated.driverPhone || undefined,
    }, { source: admin.name })
    if (parsed.data.status === 'DELIVERED') {
      await broadcastOrderEvent('delivered', {
        id: existing.order.id,
        orderNumber: existing.order.orderNumber,
        userId: existing.order.userId,
        customerPhone: existing.order.customerPhone,
        status: 'DELIVERED',
        total: existing.order.total,
      }, { source: admin.name })
    }

    const changes = [parsed.data.status ? `status: ${existing.status} → ${parsed.data.status}` : null, parsed.data.driverName ? 'rider assignment updated' : null].filter(Boolean)
    void logActivity({ userId: admin.id, userName: admin.name, userRole: admin.role, action: 'DELIVERY_UPDATE', entityType: 'DELIVERY', entityId: updated.id, description: `Updated delivery for ${existing.order.orderNumber}: ${changes.join(', ') || 'metadata'}`, req: request }).catch(() => {})
    return NextResponse.json({ delivery: updated }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } })
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) return NextResponse.json({ error: error.message }, { status: Number((error as { statusCode: number }).statusCode) })
    console.error('Delivery update error:', error)
    return NextResponse.json({ error: 'Failed to update delivery' }, { status: 500 })
  }
}
