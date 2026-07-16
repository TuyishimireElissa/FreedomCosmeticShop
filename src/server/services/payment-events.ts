/**
 * Payment Events Service — post-payment actions.
 *
 * Called when a payment succeeds or fails (via webhook or polling).
 *
 * On SUCCESS:
 *   - Update payment status to PAID
 *   - Update order status (PENDING → CONFIRMED)
 *   - Update delivery status (PENDING → ASSIGNED)
 *   - Award loyalty points to user (if authenticated)
 *   - Send SMS confirmation to customer
 *   - Send email confirmation (if email provided + enabled)
 *   - Create notification record
 *
 * On FAILURE:
 *   - Update payment status to FAILED
 *   - Record failure reason
 *   - Send SMS about failed payment
 *   - Create notification record
 */

import { db } from "@/lib/db"
import { enqueueSms } from "@/server/services/sms-queue"
import { sendOrderConfirmation } from '@/server/services/order-confirmation'
import { features } from "@/lib/env"
import { BUSINESS } from "@/lib/business-config"
import { resolveTranslation } from '@/lib/i18n'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PaymentSuccessPayload {
  paymentId: string
  orderId: string
  /** Provider transaction ID (PayPack or Flutterwave) */
  providerTransactionId?: string
  /** Card details (for card payments) */
  cardLast4?: string
  cardBrand?: string
}

export interface PaymentFailurePayload {
  paymentId: string
  orderId: string
  reason: string
}

// ─── Success handler ─────────────────────────────────────────────────────────

/**
 * Handle a successful payment.
 *
 * This function is idempotent — if the payment is already PAID, it does nothing.
 */
export async function handlePaymentSuccess(payload: PaymentSuccessPayload): Promise<void> {
  const { paymentId, orderId, providerTransactionId, cardLast4, cardBrand } = payload

  console.log(`[Payment] Success handler: payment=${paymentId}, order=${orderId}`)

  // Fetch the payment
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { order: { include: { items: true, delivery: true } } },
  })

  if (!payment) {
    console.error(`[Payment] Payment ${paymentId} not found`)
    return
  }

  // Idempotency: already processed
  if (payment.status === "PAID") {
    console.log(`[Payment] Payment ${paymentId} already marked as PAID — skipping`)
    return
  }

  const order = payment.order
  const result = await db.$transaction(async (tx) => {
    // Serialize all payment confirmations for the same order across serverless instances.
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`
    // Durable database gate: only one webhook can claim this payment.
    const claimed = await tx.payment.updateMany({
      where: { id: paymentId, status: { not: 'PAID' } },
      data: {
        status: 'PAID',
        completedAt: new Date(),
        providerTransactionId: providerTransactionId || payment.providerTransactionId,
        cardLast4: cardLast4 || payment.cardLast4,
        cardBrand: cardBrand || payment.cardBrand,
      },
    })
    if (claimed.count !== 1) return { processed: false, stockIssue: false, duplicatePayment: false }
    const otherPaid = await tx.payment.findFirst({ where: { orderId, id: { not: paymentId }, status: 'PAID' }, select: { id: true } })
    if (otherPaid) {
      await tx.securityAlert.create({ data: { type: 'DUPLICATE_PAYMENT', severity: 'CRITICAL', title: 'Duplicate payment received', message: `Order ${order.orderNumber} has more than one paid transaction and requires review.`, metadata: { orderId, orderNumber: order.orderNumber, paymentId, previousPaymentId: otherPaid.id } } })
      return { processed: true, stockIssue: false, duplicatePayment: true }
    }

    const required = new Map<string, { name: string; quantity: number }>()
    const bundleSales = new Map<string, number>()
    const missingBundles: Array<{ productId: string; productName: string; needed: number; available: number }> = []
    const addRequired = (productId: string, name: string, quantity: number) => {
      const current = required.get(productId)
      required.set(productId, { name, quantity: (current?.quantity || 0) + quantity })
    }
    for (const item of order.items) {
      if (item.bundleId) {
        const bundle = await tx.bundle.findUnique({ where: { id: item.bundleId }, include: { products: { include: { product: { select: { name: true } } } } } })
        if (!bundle) { missingBundles.push({ productId: item.bundleId, productName: item.name, needed: item.quantity, available: 0 }); continue }
        bundleSales.set(bundle.id, (bundleSales.get(bundle.id) || 0) + item.quantity)
        for (const component of bundle.products) addRequired(component.productId, component.product.name, component.quantity * item.quantity)
      } else if (item.productId) addRequired(item.productId, item.name, item.quantity)
    }
    for (const productId of [...required.keys()].sort()) await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${productId} FOR UPDATE`
    const currentProducts = await tx.product.findMany({ where: { id: { in: [...required.keys()] } }, select: { id: true, name: true, stock: true, isActive: true, isDeleted: true } })
    const insufficient = [...missingBundles, ...[...required.entries()].flatMap(([productId, needed]) => {
      const product = currentProducts.find((entry) => entry.id === productId)
      return !product || !product.isActive || product.isDeleted || product.stock < needed.quantity
        ? [{ productId, productName: product?.name || needed.name, needed: needed.quantity, available: product?.stock || 0 }]
        : []
    })]

    if (insufficient.length > 0) {
      await tx.order.update({ where: { id: orderId }, data: { status: 'CONFIRMED', notes: [order.notes, 'Paid order requires stock review.'].filter(Boolean).join('\n') } })
      await tx.securityAlert.create({ data: { type: 'INSUFFICIENT_STOCK', severity: 'HIGH', title: 'Stock review required for paid order', message: `Paid order ${order.orderNumber} requires stock review.`, metadata: { orderId, orderNumber: order.orderNumber, items: insufficient } } })
      return { processed: true, stockIssue: true, duplicatePayment: false }
    }

    for (const [productId, needed] of required) {
      const updated = await tx.product.updateMany({ where: { id: productId, stock: { gte: needed.quantity }, isActive: true, isDeleted: false }, data: { stock: { decrement: needed.quantity } } })
      if (updated.count !== 1) throw new Error(`Concurrent stock change while confirming order ${order.orderNumber}`)
    }
    for (const [bundleId, quantity] of bundleSales) await tx.bundle.update({ where: { id: bundleId }, data: { totalSales: { increment: quantity } } })
    await tx.order.update({ where: { id: orderId }, data: { status: 'CONFIRMED' } })
    await tx.delivery.updateMany({ where: { orderId }, data: { status: 'ASSIGNED', assignedAt: new Date() } })
    return { processed: true, stockIssue: false, duplicatePayment: false }
  })
  if (!result.processed) return

  // Award loyalty points (if user is authenticated)
  if (!result.duplicatePayment && order.userId && order.loyaltyPointsEarned > 0) {
    await awardLoyaltyPoints(order.userId, order.loyaltyPointsEarned, orderId, order.orderNumber)
  }

  // Send one bilingual transactional confirmation after the atomic payment gate.
  const confirmationLanguage = checkoutLanguage(payment.webhookData)
  await sendOrderConfirmation({
    orderId,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    totalAmount: order.total,
    deliveryDistrict: order.district || order.city,
    estimatedDelivery: order.delivery?.estimatedArrival,
    paymentMethod: payment.method,
    language: confirmationLanguage,
    paymentConfirmed: true,
    requiresStockReview: result.stockIssue,
    requiresPaymentReview: result.duplicatePayment,
  }).catch(() => ({ sms: 'failed' as const, email: 'failed' as const }))

  // Create in-app notification (if user is authenticated)
  if (order.userId) {
    await db.notification.create({
      data: {
        userId: order.userId,
        type: "ORDER_UPDATE",
        title: resolveTranslation(confirmationLanguage, 'confirmation.notification_payment_title'),
        body: resolveTranslation(confirmationLanguage, result.duplicatePayment ? 'confirmation.notification_payment_review' : result.stockIssue ? 'confirmation.notification_stock_review' : 'confirmation.notification_payment_body', { order: order.orderNumber }),
        data: JSON.stringify({ orderId, orderNumber: order.orderNumber, status: "CONFIRMED" }),
        linkType: "ORDER",
        linkUrl: order.orderNumber,
        channel: "IN_APP",
        sentAt: new Date(),
      },
    }).catch((e) => console.error("[Payment] Notification create failed:", e))
  }

  console.log(`[Payment] Success handler complete: order ${order.orderNumber} confirmed`)
}

// ─── Failure handler ─────────────────────────────────────────────────────────

/**
 * Handle a failed payment.
 *
 * This function is idempotent — if the payment is already FAILED, it does nothing.
 */
export async function handlePaymentFailure(payload: PaymentFailurePayload): Promise<void> {
  const { paymentId, orderId, reason } = payload

  console.log(`[Payment] Failure handler: payment=${paymentId}, order=${orderId}, reason=${reason}`)

  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { order: true },
  })

  if (!payment) {
    console.error(`[Payment] Payment ${paymentId} not found`)
    return
  }

  // Durable failure gate: duplicate failures do nothing and a late failure can never overwrite PAID.
  const claimedFailure = await db.payment.updateMany({
    where: { id: paymentId, status: { notIn: ['FAILED', 'PAID'] } },
    data: { status: 'FAILED', failureReason: reason },
  })
  if (claimedFailure.count !== 1) return

  const order = payment.order

  // Send SMS about failed payment
  if (features.sms) {
    // Use a custom message for payment failure
    const message = `Your payment for order ${order.orderNumber} failed. Please try again or use a different payment method. ${BUSINESS.tradingName}`
    enqueueSms(order.customerPhone, message, {
      priority: 1, // high
    })
  }

  // Create notification
  if (order.userId) {
    await db.notification.create({
      data: {
        userId: order.userId,
        type: "ORDER_UPDATE",
        title: "Payment failed",
        body: `Your payment for order ${order.orderNumber} failed. Please try again or use a different payment method.`,
        data: JSON.stringify({ orderId, orderNumber: order.orderNumber, reason }),
        linkType: "ORDER",
        linkUrl: order.orderNumber,
        channel: "IN_APP",
        sentAt: new Date(),
      },
    }).catch((e) => console.error("[Payment] Notification create failed:", e))
  }

  console.log(`[Payment] Failure handler complete: order ${order.orderNumber}`)
}

function checkoutLanguage(value: string | null): 'en' | 'rw' {
  try { return JSON.parse(value || '{}').checkoutLanguage === 'en' ? 'en' : 'rw' } catch { return 'rw' }
}

// ─── Loyalty points ──────────────────────────────────────────────────────────

/**
 * Award loyalty points to a user.
 * Creates a LoyaltyPoints transaction + updates the user's balance.
 */
async function awardLoyaltyPoints(
  userId: string,
  points: number,
  orderId: string,
  orderNumber: string
): Promise<void> {
  // Get current balance
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { loyaltyPoints: true },
  })

  if (!user) return

  const newBalance = user.loyaltyPoints + points

  // Create ledger entry + update balance
  await db.$transaction([
    db.loyaltyPoints.create({
      data: {
        userId,
        points,
        type: "EARNED",
        reason: `Order ${orderNumber}`,
        orderId,
        balanceAfter: newBalance,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year expiry
      },
    }),
    db.user.update({
      where: { id: userId },
      data: { loyaltyPoints: newBalance },
    }),
  ])

  console.log(`[Payment] Awarded ${points} loyalty points to user ${userId}`)
}
