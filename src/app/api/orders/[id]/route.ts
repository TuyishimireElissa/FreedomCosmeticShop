export const dynamic = 'force-dynamic'

/**
 * GET /api/orders/[id]
 * Returns a single order by id (or order number) including items, payments, delivery.
 *
 * PATCH /api/orders/[id]
 * Updates an order's status. Body: { status: "PENDING" | "CONFIRMED" | ... }
 *
 * Note: paymentStatus is now on the Payment model. To update payment status,
 * PATCH the payment via /api/orders/[id]/payments or use the admin's
 * "Mark as paid" button which calls this endpoint with { paymentStatus }.
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { z } from "zod"
import { broadcastOrderEvent, broadcastDeliveryEvent } from "@/lib/realtime"
import { getSmsMessage } from "@/server/services/sms-templates"
import { enqueueSms } from "@/server/services/sms-queue"
import { logActivity } from "@/server/services/activity"
import { AuthError } from '@/lib/auth'
import { DESTRUCTIVE_OPERATIONS, requireDestructiveOperation, requirePermission, PERMISSIONS, rateLimit } from "@/lib/permissions"
import { features } from "@/lib/env"
import { createReviewRequests } from '@/lib/review-requests'
import { resolveTranslation } from '@/lib/i18n'
import { BUSINESS } from '@/lib/business-config'
import { refreshWholesaleRetentionMetric } from '@/server/services/wholesale-retention'

const VALID_STATUSES = [
  "PENDING",
  // Accepted as a transition *source* via ALLOWED_STATUS_TRANSITIONS. Listed
  // here so the Zod schema does not reject a payload that names it, but no
  // admin action moves an order *into* this state — only the WhatsApp
  // checkout route sets it, at creation.
  "PENDING_WHATSAPP",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
] as const

const VALID_PAYMENT_STATUSES = [
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
] as const

const ALLOWED_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  // WhatsApp orders are saved before the customer sends the message, so they
  // start at PENDING_WHATSAPP. Without this row the lookup below falls back to
  // [] and every transition is refused, freezing the order permanently.
  // They rejoin the normal chain at CONFIRMED.
  PENDING_WHATSAPP: ['CONFIRMED', 'CANCELLED'],
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'RETURNED'],
  DELIVERED: ['RETURNED'],
  CANCELLED: [],
  RETURNED: [],
}

const PatchSchema = z.object({
  status: z.enum(VALID_STATUSES).optional(),
  // paymentStatus updates the FIRST payment record for backward compat
  paymentStatus: z.enum(VALID_PAYMENT_STATUSES).optional(),
})

/** Raised inside the stock transaction to roll it back and answer 409. */
class StockShortfallError extends Error {
  constructor(public readonly items: Array<{ productId: string; name: string; needed: number; available: number }>) {
    super('INSUFFICIENT_STOCK')
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(PERMISSIONS.ORDERS_READ)
    const { id } = await params

    const order = await db.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
      include: {
        items: true,
        payments: true,
        delivery: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // For backward compat with the confirmation view, derive paymentMethod
    // and paymentStatus from the first payment record
    const firstPayment = order.payments[0]
    const serializedOrder = {
      ...order,
      paymentMethod: firstPayment?.method || "COD",
      paymentStatus: firstPayment?.status || "PENDING",
    }

    return NextResponse.json({ order: serializedOrder })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.statusCode })
    console.error("Failed to fetch order:", error)
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication is mandatory. Never continue after an authorization error.
    const adminUser = await requirePermission(PERMISSIONS.ORDERS_UPDATE)
    const rl = rateLimit(`admin:${adminUser.id}:order-update`, { maxActions: 100, windowMs: 60000 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limited. Too many order updates." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs || 1000) / 1000)) } }
      )
    }

    const { id } = await params
    const body = await req.json()

    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success || (!parsed.data.status && !parsed.data.paymentStatus)) {
      return NextResponse.json(
        { error: "Invalid update", details: parsed.success ? undefined : parsed.error.flatten() },
        { status: 400 }
      )
    }
    if (parsed.data.status === 'CANCELLED' || parsed.data.status === 'RETURNED') {
      await requireDestructiveOperation(DESTRUCTIVE_OPERATIONS.ORDER_CANCEL_OR_RETURN)
    }
    if (parsed.data.paymentStatus) {
      await requireDestructiveOperation(DESTRUCTIVE_OPERATIONS.PAYMENT_STATUS_CHANGE)
    }

    const existing = await db.order.findFirst({
      where: { OR: [{ id }, { orderNumber: id }] },
      include: { payments: true, delivery: true },
    })
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const oldStatus = existing.status
    const statusChanged = parsed.data.status && parsed.data.status !== oldStatus
    if (statusChanged && !(ALLOWED_STATUS_TRANSITIONS[oldStatus] || []).includes(parsed.data.status!)) {
      return NextResponse.json({ error: `Invalid order transition: ${oldStatus} → ${parsed.data.status}` }, { status: 409 })
    }
    const primaryPayment = existing.payments[0]
    if (parsed.data.status === 'CONFIRMED' && primaryPayment && primaryPayment.method !== 'COD' && primaryPayment.status !== 'PAID') {
      return NextResponse.json({ error: 'Online orders can be confirmed only after verified payment.' }, { status: 409 })
    }
    if (parsed.data.paymentStatus === 'PAID' && existing.payments[0]?.method !== 'COD') {
      return NextResponse.json({ error: 'Online payments can be marked paid only by a verified provider webhook.' }, { status: 409 })
    }
    if (parsed.data.paymentStatus === 'REFUNDED') {
      return NextResponse.json({ error: 'Use the protected refund action to refund a payment.' }, { status: 409 })
    }

    // ─── Stock decrement for WhatsApp orders ──────────────────────────
    //
    // Gated on the SOURCE status, not the target. Every other path already
    // takes its own stock and would be double-decremented by a `* -> CONFIRMED`
    // rule:
    //   - COD retail      is born CONFIRMED with stock taken at creation
    //   - online retail   is decremented by the payment webhook, which writes
    //                     CONFIRMED directly and never calls this route
    //   - wholesale/CREDIT is created PENDING with stock ALREADY taken, so an
    //                     admin moving it PENDING -> CONFIRMED would take it twice
    // PENDING_WHATSAPP is reachable only from /api/orders/whatsapp, which
    // verifies stock but never decrements it. That makes this branch the one
    // place the units actually come off, and double-decrement structurally
    // impossible rather than merely unlikely.
    const takesStockNow = oldStatus === 'PENDING_WHATSAPP' && parsed.data.status === 'CONFIRMED'
    if (takesStockNow) {
      try {
        await db.$transaction(async (tx) => {
          const lines = await tx.orderItem.findMany({
            where: { orderId: existing.id, productId: { not: null } },
            select: { productId: true, name: true, quantity: true },
          })

          // Merge duplicate lines so a product ordered twice is checked once
          // against the total it actually needs.
          const required = new Map<string, { name: string; quantity: number }>()
          for (const line of lines) {
            const current = required.get(line.productId!)
            required.set(line.productId!, {
              name: line.name,
              quantity: (current?.quantity || 0) + line.quantity,
            })
          }

          // Deterministic lock order prevents deadlock when two admins confirm
          // overlapping orders at the same moment.
          for (const productId of [...required.keys()].sort()) {
            await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${productId} FOR UPDATE`
          }

          const products = await tx.product.findMany({
            where: { id: { in: [...required.keys()] } },
            select: { id: true, name: true, stock: true, isActive: true, isDeleted: true },
          })

          const shortfall = [...required.entries()].flatMap(([productId, needed]) => {
            const product = products.find((entry) => entry.id === productId)
            return !product || !product.isActive || product.isDeleted || product.stock < needed.quantity
              ? [{ productId, name: product?.name || needed.name, needed: needed.quantity, available: product?.stock ?? 0 }]
              : []
          })
          if (shortfall.length > 0) throw new StockShortfallError(shortfall)

          for (const [productId, needed] of required) {
            const updated = await tx.product.updateMany({
              where: { id: productId, stock: { gte: needed.quantity }, isActive: true, isDeleted: false },
              data: { stock: { decrement: needed.quantity } },
            })
            // Optimistic lock: someone changed stock between read and write.
            if (updated.count !== 1) throw new StockShortfallError([{ productId, name: needed.name, needed: needed.quantity, available: 0 }])
          }

          // Status moves inside the same transaction, so stock and status can
          // never disagree — both commit or neither does.
          await tx.order.update({ where: { id: existing.id }, data: { status: 'CONFIRMED' } })

          const depleted = products.filter((product) => {
            const needed = required.get(product.id)
            return needed ? product.stock - needed.quantity <= 0 : false
          })
          if (depleted.length > 0) {
            await tx.securityAlert.create({
              data: {
                type: 'INSUFFICIENT_STOCK',
                severity: 'HIGH',
                title: 'Product out of stock after WhatsApp order',
                message: `Confirming order ${existing.orderNumber} took the last units of ${depleted.length} product(s).`,
                metadata: { orderId: existing.id, orderNumber: existing.orderNumber, products: depleted.map((p) => p.id) },
              },
            })
          }
        })
      } catch (stockError) {
        if (stockError instanceof StockShortfallError) {
          return NextResponse.json(
            { error: 'Insufficient stock to confirm this order.', code: 'INSUFFICIENT_STOCK', items: stockError.items },
            { status: 409 },
          )
        }
        throw stockError
      }
    }

    // Update order status if provided
    if (parsed.data.status && !takesStockNow) {
      await db.order.update({
        where: { id: existing.id },
        data: { status: parsed.data.status },
      })
    }
    if (parsed.data.status) {
      if (parsed.data.status === 'CANCELLED') {
        await Promise.all([
          db.payment.updateMany({
            where: { orderId: existing.id, status: 'PENDING' },
            data: { status: 'FAILED', failureReason: 'Order cancelled' },
          }),
          db.delivery.updateMany({
            where: { orderId: existing.id, status: { not: 'DELIVERED' } },
            data: { status: 'FAILED', failureReason: 'Order cancelled' },
          }),
        ])
      }

      // If status is SHIPPED, update delivery status too
      if (parsed.data.status === "SHIPPED" && existing.delivery) {
        await db.delivery.update({
          where: { orderId: existing.id },
          data: {
            status: "IN_TRANSIT",
            pickedUpAt: new Date(),
          },
        })
      }
      // If status is DELIVERED, mark delivery as delivered
      if (parsed.data.status === "DELIVERED" && existing.delivery) {
        await db.delivery.update({
          where: { orderId: existing.id },
          data: {
            status: "DELIVERED",
            actualArrival: new Date(),
            deliveredAt: new Date(),
          },
        })
      }
    }

    // Update payment status if provided (updates the first payment record)
    if (parsed.data.paymentStatus && existing.payments.length > 0) {
      const completedAt = parsed.data.paymentStatus === "PAID" ? new Date() : null
      await db.payment.update({
        where: { id: existing.payments[0].id },
        data: { status: parsed.data.paymentStatus, completedAt },
      })
      const paid = parsed.data.paymentStatus === "PAID"
      await db.wholesaleInvoice.updateMany({
        where: { orderId: existing.id },
        data: {
          isPaid: paid,
          paidAt: completedAt,
          paidAmount: paid ? existing.total : 0,
          balanceDue: paid ? 0 : existing.total,
          paymentMethod: existing.payments[0].method,
          isOverdue: false,
          daysOverdue: 0,
        },
      })
      if (existing.userId && existing.orderType === 'WHOLESALE') await refreshWholesaleRetentionMetric(existing.userId)
    }

    // Re-fetch the updated order with relations
    const updated = await db.order.findUnique({
      where: { id: existing.id },
      include: { items: true, payments: true, delivery: true },
    })

    // Serialize for backward compat
    const firstPayment = updated?.payments[0]
    const serializedOrder = updated
      ? {
          ...updated,
          paymentMethod: firstPayment?.method || "COD",
          paymentStatus: firstPayment?.status || "PENDING",
        }
      : null

    // ─── Section 3: Real-time broadcast + SMS auto-trigger ──────────
    if (statusChanged && updated && serializedOrder) {
      const newStatus = parsed.data.status!
      if (newStatus === 'DELIVERED') {
        await createReviewRequests(updated.id).catch((error) => console.error('Review request creation failed:', error instanceof Error ? error.message : 'unknown'))
      }
      // Map order status to broadcast action
      const actionMap: Record<string, "confirmed" | "processing" | "shipped" | "delivered" | "cancelled"> = {
        CONFIRMED: "confirmed",
        PROCESSING: "processing",
        SHIPPED: "shipped",
        DELIVERED: "delivered",
        CANCELLED: "cancelled",
      }
      const action = actionMap[newStatus]
      if (action) {
        // Broadcast to all connected clients (admin + customer tracking page)
        await broadcastOrderEvent(action, {
          id: updated.id,
          orderNumber: updated.orderNumber,
          userId: updated.userId,
          customerPhone: updated.customerPhone,
          status: updated.status,
          total: updated.total,
        }, { source: adminUser?.name || "system" })

        // If delivered, also broadcast a delivery event
        if (newStatus === "DELIVERED" && updated.delivery) {
          await broadcastDeliveryEvent("updated", {
            orderId: updated.id,
            orderNumber: updated.orderNumber,
            userId: updated.userId,
            riderName: updated.delivery.driverName || undefined,
            riderPhone: updated.delivery.driverPhone || undefined,
          }, { source: adminUser?.name || "system" })
        }
      }

      // ─── Automatic SMS to customer on status change ───────────────
      if (features.sms) {
        const customerPhone = updated.customerPhone
        const orderNumber = updated.orderNumber

        if (newStatus === "CONFIRMED") {
          const message = getSmsMessage("ORDER_PLACED", "en", { orderNumber })
          enqueueSms(customerPhone, message, { priority: 1, template: "ORDER_PLACED" })
        } else if (newStatus === "SHIPPED" && updated.delivery?.driverName) {
          const message = getSmsMessage("ORDER_SHIPPED", "en", {
            orderNumber,
            riderName: updated.delivery.driverName,
            riderPhone: updated.delivery.driverPhone || "N/A",
            etaDays: "1-2",
          })
          enqueueSms(customerPhone, message, { priority: 1, template: "ORDER_SHIPPED" })
        } else if (newStatus === "DELIVERED") {
          const message = resolveTranslation('rw', 'sms.order_delivered_status', { order: orderNumber, business: BUSINESS.tradingName })
          enqueueSms(customerPhone, message, { priority: 1, template: "ORDER_PLACED" })
        } else if (newStatus === "CANCELLED") {
          // Custom cancellation SMS (no template exists yet)
          const support = BUSINESS.whatsapp.includes('TODO:') ? '' : ` Questions? WhatsApp ${BUSINESS.whatsapp}.`
          const message = `Order ${orderNumber} has been cancelled. If you paid, a refund of ${updated.total} RWF will be processed.${support} FreedomCosmeticShop`
          enqueueSms(customerPhone, message, { priority: 1, template: "ORDER_PLACED" })
        }
      }

      // Best-effort audit log
      if (adminUser) {
        void logActivity({
          userId: adminUser.id,
          userName: adminUser.name,
          userRole: adminUser.role,
          action: "ORDER_UPDATE",
          entityType: "ORDER",
          entityId: updated.id,
          description: `Updated order ${updated.orderNumber}: ${oldStatus} → ${newStatus}`,
          req,
        }).catch(() => {})
      }
    }

    return NextResponse.json({ order: serializedOrder })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.statusCode })
    console.error("Failed to update order:", error)
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    )
  }
}
