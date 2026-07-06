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
import { getSmsMessage } from "@/server/services/sms-templates"
import { enqueueSms } from "@/server/services/sms-queue"
import { sendOrderConfirmationEmail } from "@/server/services/email"
import { features } from "@/lib/env"

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
    include: { order: { include: { items: true } } },
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

  // Update payment
  await db.payment.update({
    where: { id: paymentId },
    data: {
      status: "PAID",
      completedAt: new Date(),
      providerTransactionId: providerTransactionId || payment.providerTransactionId,
      cardLast4: cardLast4 || payment.cardLast4,
      cardBrand: cardBrand || payment.cardBrand,
    },
  })

  // Update order status (PENDING → CONFIRMED) if not already confirmed
  const order = payment.order
  if (order.status === "PENDING") {
    await db.order.update({
      where: { id: orderId },
      data: { status: "CONFIRMED" },
    })
  }

  // Update delivery status
  await db.delivery.updateMany({
    where: { orderId },
    data: { status: "ASSIGNED", assignedAt: new Date() },
  })

  // Award loyalty points (if user is authenticated)
  if (order.userId && order.loyaltyPointsEarned > 0) {
    await awardLoyaltyPoints(order.userId, order.loyaltyPointsEarned, orderId, order.orderNumber)
  }

  // Send SMS confirmation (payment confirmed)
  if (features.sms) {
    const message = getSmsMessage("PAYMENT_CONFIRMED", "en", {
      orderNumber: order.orderNumber,
      amount: order.total,
    })
    enqueueSms(order.customerPhone, message, {
      priority: 0, // critical
      template: "PAYMENT_CONFIRMED",
    })
  }

  // Send email confirmation
  if (features.email && order.customerEmail) {
    await sendOrderConfirmationEmail(order.customerEmail, order.orderNumber, order.total).catch(
      (e) => console.error("[Payment] Email send failed:", e)
    )
  }

  // Create in-app notification (if user is authenticated)
  if (order.userId) {
    await db.notification.create({
      data: {
        userId: order.userId,
        type: "ORDER_UPDATE",
        title: "Payment confirmed!",
        body: `Your order ${order.orderNumber} has been confirmed. We're preparing your items.`,
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

  // Idempotency
  if (payment.status === "FAILED") {
    console.log(`[Payment] Payment ${paymentId} already marked as FAILED — skipping`)
    return
  }

  // Update payment
  await db.payment.update({
    where: { id: paymentId },
    data: {
      status: "FAILED",
      failureReason: reason,
    },
  })

  const order = payment.order

  // Send SMS about failed payment
  if (features.sms) {
    // Use a custom message for payment failure
    const message = `Your payment for order ${order.orderNumber} failed. Please try again or use a different payment method. Ubumwe Beauty`
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
