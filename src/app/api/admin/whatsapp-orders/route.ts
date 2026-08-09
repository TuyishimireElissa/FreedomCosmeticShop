export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/whatsapp-orders
 *
 * Order list for the WhatsApp dashboard. Separate from /api/admin/orders
 * because that route cannot express "WhatsApp orders only" — it has no
 * whatsappSentAt filter — and the dashboard must not show the six legacy
 * card/COD orders that never came through WhatsApp.
 *
 * Read-only. Every mutation goes through the existing guarded routes:
 * status via PATCH /api/orders/[id], money via
 * POST /api/admin/orders/[id]/record-payment.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthError } from '@/lib/auth'
import { PERMISSIONS, requirePermission } from '@/lib/permissions'

/** Matches VALID_STATUSES in /api/orders/[id]. RETURNED is included so an
 *  order that reaches it stays visible instead of vanishing from every view. */
const STATUSES = [
  'PENDING_WHATSAPP',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
] as const

const headers = { 'Cache-Control': 'private, no-store, max-age=0' }

export async function GET(request: Request) {
  try {
    await requirePermission(PERMISSIONS.ORDERS_READ)

    const params = new URL(request.url).searchParams
    const status = params.get('status')
    const search = params.get('search')?.trim() || ''
    const payment = params.get('payment')
    const page = Number(params.get('page') || 1)
    const pageSize = Number(params.get('pageSize') || 25)

    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      return NextResponse.json({ success: false, error: 'INVALID_PAGINATION' }, { status: 400, headers })
    }
    if (status && status !== 'all' && !STATUSES.includes(status as (typeof STATUSES)[number])) {
      return NextResponse.json({ success: false, error: 'INVALID_STATUS' }, { status: 400, headers })
    }

    const where = {
      // The defining trait of a WhatsApp order. Set by /api/orders/whatsapp at
      // creation and never cleared.
      whatsappSentAt: { not: null },
      ...(status && status !== 'all' ? { status } : {}),
      // Payment state is NOT an order status — it lives on Payment.status — so
      // it is a separate control rather than another entry in the status list.
      ...(payment === 'paid' ? { payments: { some: { status: 'PAID' } } } : {}),
      ...(payment === 'unpaid' ? { payments: { none: { status: 'PAID' } } } : {}),
      ...(search
        ? {
            OR: [
              { orderNumber: { contains: search, mode: 'insensitive' as const } },
              { customerName: { contains: search, mode: 'insensitive' as const } },
              // Phones are stored unnormalised (+250…, 250…, 07…), so match on
              // the raw fragment the admin typed rather than assuming a format.
              { customerPhone: { contains: search } },
            ],
          }
        : {}),
    }

    const [orders, total, statusCounts, unfiltered] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: true, payments: true, delivery: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
      prisma.order.groupBy({
        by: ['status'],
        where: { whatsappSentAt: { not: null } },
        _count: { _all: true },
      }),
      // Distinguishes "no orders at all" (show onboarding empty state) from
      // "no matches for this filter" (show a clear-filters hint).
      prisma.order.count({ where: { whatsappSentAt: { not: null } } }),
    ])

    return NextResponse.json(
      {
        success: true,
        data: {
          orders,
          pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
          counts: Object.fromEntries(statusCounts.map((row) => [row.status, row._count._all])),
          totalWhatsAppOrders: unfiltered,
        },
      },
      { headers },
    )
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode, headers })
    }
    console.error('[whatsapp-orders] list failed', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ success: false, error: 'LIST_FAILED' }, { status: 500, headers })
  }
}
