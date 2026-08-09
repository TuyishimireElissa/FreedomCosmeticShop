export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/orders/[id]/record-payment
 *
 * Records money that has already physically arrived for a WhatsApp order.
 *
 * WhatsApp orders are created by /api/orders/whatsapp with no Payment row —
 * nothing has been charged, the customer pays by MoMo/Airtel/cash when the
 * goods arrive. Every existing admin surface derives payment state from
 * `payments[0]`, so with no row the order reads as "COD / PENDING" and cannot
 * be marked paid. This endpoint creates that row.
 *
 * Deliberately isolated from the shared /api/orders/[id] workflow: this writes
 * money records, that one moves order status. Order.status is NOT touched here.
 *
 * Vocabulary note — this route reuses the values the rest of the system
 * already speaks (`Payment.status = 'PAID'`, `method = MTN_MOMO |
 * AIRTEL_MONEY | CASH`) rather than inventing 'COMPLETED'/'MOMO'/'AIRTEL',
 * which would be invisible to the analytics funnel and split the groupBy
 * buckets in /api/admin/analytics.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { AuthError } from '@/lib/auth'
import {
  DESTRUCTIVE_OPERATIONS,
  rateLimit,
  requireDestructiveOperation,
} from '@/lib/permissions'
import { logActivity } from '@/server/services/activity'

/** Money can only be recorded once the order is a real commitment. */
const RECORDABLE_STATUSES = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const

/**
 * CASH is new vocabulary, added deliberately: COD describes a *checkout
 * choice*, whereas this records cash that has physically changed hands for an
 * order that was never a COD checkout.
 */
const METHODS = ['MTN_MOMO', 'AIRTEL_MONEY', 'CASH'] as const

const schema = z
  .object({
    method: z.enum(METHODS),
    amount: z.number().int().min(1).max(100_000_000),
    notes: z.string().trim().max(500).optional(),
    reference: z.string().trim().max(120).optional(),
    // Amounts must match the order total. Kigali retail negotiates, so a
    // deliberate override is allowed — but it must be explicit and explained,
    // and the discrepancy is written to the audit log.
    allowMismatch: z.boolean().optional().default(false),
  })
  .strict()
  .refine((value) => !value.allowMismatch || Boolean(value.notes), {
    path: ['notes'],
    message: 'NOTES_REQUIRED_FOR_MISMATCH',
  })

const headers = { 'Cache-Control': 'private, no-store, max-age=0' }

class RecordError extends Error {
  constructor(message: string, public status: number, public extra?: Record<string, unknown>) {
    super(message)
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Recording money is payment-sensitive. Reuse the existing policy rather
    // than inventing a weaker one: SUPER_ADMIN + ADMIN only.
    const admin = await requireDestructiveOperation(DESTRUCTIVE_OPERATIONS.PAYMENT_STATUS_CHANGE)

    const limit = rateLimit(`admin:${admin.id}:record-payment`, { maxActions: 30, windowMs: 60_000 })
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, error: 'RATE_LIMITED' },
        { status: 429, headers: { ...headers, 'Retry-After': String(Math.ceil((limit.retryAfterMs || 1000) / 1000)) } },
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: 'INVALID_JSON' }, { status: 400, headers })
    }

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_INPUT',
          issues: parsed.error.issues.map((issue) => ({ field: issue.path.join('.'), code: issue.message })),
        },
        { status: 400, headers },
      )
    }
    const input = parsed.data

    const result = await prisma.$transaction(async (tx) => {
      // Row lock so two admins recording the same payment cannot both pass the
      // "already paid" check. Matches the locking idiom used by the review
      // moderation route and payment-events.ts.
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE`

      const order = await tx.order.findUnique({
        where: { id },
        select: { id: true, orderNumber: true, status: true, total: true, adminNotes: true, payments: { select: { id: true, status: true, method: true } } },
      })
      if (!order) throw new RecordError('ORDER_NOT_FOUND', 404)

      if (!RECORDABLE_STATUSES.includes(order.status as (typeof RECORDABLE_STATUSES)[number])) {
        throw new RecordError('ORDER_NOT_RECORDABLE', 409, { status: order.status, allowed: RECORDABLE_STATUSES })
      }

      // Idempotency: an order that already has settled money is not recorded twice.
      const settled = order.payments.find((payment) => payment.status === 'PAID')
      if (settled) throw new RecordError('ALREADY_PAID', 409, { paymentId: settled.id, method: settled.method })

      const mismatch = input.amount !== order.total
      if (mismatch && !input.allowMismatch) {
        throw new RecordError('AMOUNT_MISMATCH', 400, { expected: order.total, received: input.amount })
      }

      const now = new Date()
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          method: input.method,
          // 'PAID' — the value the analytics funnel, CSV export and admin UI
          // all already read. 'COMPLETED' would be invisible to every one.
          status: 'PAID',
          amount: input.amount,
          // Existing column; a supplied reference is also written to the
          // @unique providerTransactionId so the database itself rejects the
          // same MoMo transaction being entered twice.
          providerReference: input.reference || null,
          providerTransactionId: input.reference ? `manual:${input.reference}` : null,
          completedAt: now,
        },
        select: { id: true, method: true, amount: true, status: true, completedAt: true },
      })

      // Order.paymentStatus does not exist — it is derived from payments[0] at
      // read time. These two columns are real, were migrated in ad37a33, and
      // nothing else writes them.
      const noteLine = input.notes
        ? [order.adminNotes, `[${now.toISOString().slice(0, 10)}] ${admin.name || admin.id}: ${input.notes}`]
            .filter(Boolean)
            .join('\n')
        : order.adminNotes
      await tx.order.update({
        where: { id: order.id },
        data: { paymentReceivedAt: now, paymentMethod: input.method, adminNotes: noteLine },
      })

      return { order, payment, mismatch, now }
    })

    void logActivity({
      userId: admin.id,
      userName: admin.name,
      userRole: admin.role,
      action: 'PAYMENT_RECORDED',
      entityType: 'ORDER',
      entityId: result.order.id,
      description: `Recorded ${input.method} payment of ${input.amount} RWF for order ${result.order.orderNumber}${
        result.mismatch ? ` (order total ${result.order.total} RWF — deliberate mismatch: ${input.notes})` : ''
      }`,
      severity: result.mismatch ? 'warn' : 'info',
      req: request,
    }).catch(() => {})

    return NextResponse.json(
      {
        success: true,
        data: {
          paymentId: result.payment.id,
          orderId: result.order.id,
          orderNumber: result.order.orderNumber,
          method: result.payment.method,
          amount: result.payment.amount,
          paymentStatus: result.payment.status,
          recordedAt: result.now.toISOString(),
          amountMatchedOrderTotal: !result.mismatch,
        },
      },
      { status: 201, headers },
    )
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode, headers })
    }
    if (error instanceof RecordError) {
      return NextResponse.json({ success: false, error: error.message, ...error.extra }, { status: error.status, headers })
    }
    // A duplicate manual reference trips the unique index on providerTransactionId.
    if (typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ success: false, error: 'DUPLICATE_REFERENCE' }, { status: 409, headers })
    }
    console.error('[record-payment] failed', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ success: false, error: 'RECORD_FAILED' }, { status: 500, headers })
  }
}
