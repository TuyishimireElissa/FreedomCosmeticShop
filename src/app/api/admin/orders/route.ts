export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { DESTRUCTIVE_OPERATIONS, requireDestructiveOperation } from '@/lib/permissions'
import { logActivity } from '@/server/services/activity'

const updateSchema = z.object({ orderId: z.string().min(1), status: z.enum(['PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED','RETURNED']).optional(), paymentStatus: z.enum(['PENDING','PAID','FAILED','REFUNDED']).optional() }).refine((value) => value.status || value.paymentStatus, 'status or paymentStatus is required')

export async function GET(request: Request) {
  try {
    await requireRole('SUPER_ADMIN','ADMIN','MANAGER','STAFF')
    const params = new URL(request.url).searchParams; const page = Math.max(1, Number(params.get('page') || 1)); const pageSize = Math.min(100, Math.max(1, Number(params.get('pageSize') || 25))); const status = params.get('status'); const search = params.get('search')?.trim()
    if (!Number.isInteger(page) || !Number.isInteger(pageSize)) return NextResponse.json({ success: false, error: 'Invalid pagination' }, { status: 400 })
    const where = { ...(status && status !== 'all' ? { status } : {}), ...(search ? { OR: [{ orderNumber: { contains: search, mode: 'insensitive' as const } }, { customerName: { contains: search, mode: 'insensitive' as const } }, { customerPhone: { contains: search } }] } : {}) }
    const [orders,total] = await Promise.all([prisma.order.findMany({ where, include: { items: true, payments: true, delivery: true }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }), prisma.order.count({ where })])
    const pagination = { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    return NextResponse.json({ success: true, data: { orders, pagination }, orders, pagination })
  } catch (error) { const status = error instanceof Error && 'statusCode' in error ? Number((error as { statusCode: number }).statusCode) : 500; console.error('Admin orders GET error:', error); return NextResponse.json({ success: false, error: status === 500 ? 'Failed to fetch orders' : (error as Error).message }, { status }) }
}

export async function PATCH(request: Request) {
  try {
    let admin = await requireRole('SUPER_ADMIN','ADMIN','MANAGER','STAFF')
    const parsed = updateSchema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid order update' }, { status: 400 })
    if (parsed.data.status === 'CANCELLED' || parsed.data.status === 'RETURNED') {
      admin = await requireDestructiveOperation(DESTRUCTIVE_OPERATIONS.ORDER_CANCEL_OR_RETURN)
    }
    if (parsed.data.paymentStatus === 'REFUNDED') {
      admin = await requireDestructiveOperation(DESTRUCTIVE_OPERATIONS.PAYMENT_REFUND)
    } else if (parsed.data.paymentStatus) {
      admin = await requireDestructiveOperation(DESTRUCTIVE_OPERATIONS.PAYMENT_STATUS_CHANGE)
    }
    const order = await prisma.$transaction(async (tx) => { if (parsed.data.paymentStatus) await tx.payment.updateMany({ where: { orderId: parsed.data.orderId }, data: { status: parsed.data.paymentStatus } }); return tx.order.update({ where: { id: parsed.data.orderId }, data: parsed.data.status ? { status: parsed.data.status } : {}, include: { items: true, payments: true, delivery: true } }) })
    await logActivity({ userId: admin.id, userName: admin.name, userRole: admin.role, action: 'ORDER_UPDATE', entityType: 'ORDER', entityId: order.id, description: `Updated ${order.orderNumber}: order=${parsed.data.status || 'unchanged'}, payment=${parsed.data.paymentStatus || 'unchanged'}`, req: request })
    return NextResponse.json({ success: true, data: { order }, order })
  } catch (error) { const status = error instanceof Error && 'statusCode' in error ? Number((error as { statusCode: number }).statusCode) : 500; console.error('Admin orders PATCH error:', error); return NextResponse.json({ success: false, error: status === 500 ? 'Failed to update order' : (error as Error).message }, { status }) }
}
