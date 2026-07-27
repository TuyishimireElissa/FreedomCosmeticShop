export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PERMISSIONS, requirePermission } from '@/lib/permissions'

/** Paginated admin order list. Mutations use the guarded /api/orders/:id workflow. */
export async function GET(request: Request) {
  try {
    await requirePermission(PERMISSIONS.ORDERS_READ)
    const params = new URL(request.url).searchParams
    const page = Number(params.get('page') || 1)
    const pageSize = Number(params.get('pageSize') || 25)
    const statusFilter = params.get('status')
    const search = params.get('search')?.trim()
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      return NextResponse.json({ success: false, error: 'Invalid pagination' }, { status: 400 })
    }
    const where = {
      ...(statusFilter && statusFilter !== 'all' ? { status: statusFilter } : {}),
      ...(search ? { OR: [
        { orderNumber: { contains: search, mode: 'insensitive' as const } },
        { customerName: { contains: search, mode: 'insensitive' as const } },
        { customerPhone: { contains: search } },
      ] } : {}),
    }
    const [orders, total] = await Promise.all([
      prisma.order.findMany({ where, include: { items: true, payments: true, delivery: true }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.order.count({ where }),
    ])
    const pagination = { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    return NextResponse.json({ success: true, data: { orders, pagination }, orders, pagination }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } })
  } catch (error) {
    const status = error instanceof Error && 'statusCode' in error ? Number((error as { statusCode: number }).statusCode) : 500
    console.error('Admin orders GET error:', error)
    return NextResponse.json({ success: false, error: status === 500 ? 'Failed to fetch orders' : (error as Error).message }, { status })
  }
}
