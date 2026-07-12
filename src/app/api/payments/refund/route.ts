export const dynamic = 'force-dynamic'

/**
 * POST /api/payments/refund
 *
 * Initiate a refund (cashout) to the customer's phone via PayPack.
 * Admin only.
 *
 * Body: { orderId, reason? }
 *
 * Flow:
 *   1. Find the order + its payment
 *   2. Verify payment was PAID
 *   3. Call PayPack cashout to customer's phone
 *   4. Update payment status to REFUNDED
 *   5. Update order status to CANCELLED
 *   6. Send SMS to customer
 *
 * Returns: { success, refundReference, message }
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { cashout, PaypackError } from "@/server/services/paypack"
import { enqueueSms } from "@/server/services/sms-queue"
import { getSmsMessage } from "@/server/services/sms-templates"
import { features } from "@/lib/env"
import { z } from "zod"

const RefundSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().max(500).optional(),
})

export async function POST(req: Request) {
  try {
    await requireRole("ADMIN")

    const body = await req.json()
    const parsed = RefundSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { orderId, reason } = parsed.data

    // Find the order with its payment
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Find the PAID payment
    const payment = order.payments.find((p) => p.status === "PAID")
    if (!payment) {
      return NextResponse.json(
        { error: "No paid payment found for this order" },
        { status: 400 }
      )
    }

    // Check if already refunded
    if (payment.status === "REFUNDED") {
      return NextResponse.json(
        { error: "Payment already refunded" },
        { status: 400 }
      )
    }

    // For MoMo/Airtel payments, initiate cashout via PayPack
    if (
      (payment.method === "MTN_MOMO" || payment.method === "AIRTEL_MONEY") &&
      payment.phoneNumber
    ) {
      try {
        const refundResult = await cashout({
          amount: payment.amount,
          phone: payment.phoneNumber,
          reference: `REFUND-${order.orderNumber}`,
        })

        // Update payment status
        await db.payment.update({
          where: { id: payment.id },
          data: {
            status: "REFUNDED",
            failureReason: reason || "Refunded by admin",
          },
        })

        // Update order status
        await db.order.update({
          where: { id: orderId },
          data: { status: "CANCELLED" },
        })

        // Create a PaymentAttempt record for the refund
        await db.paymentAttempt.create({
          data: {
            orderId,
            phone: payment.phoneNumber,
            amount: payment.amount,
            network: payment.network || (payment.method === "MTN_MOMO" ? "MTN" : "AIRTEL"),
            reference: refundResult.transactionId,
            status: refundResult.status === "success" ? "SUCCESS" : "PENDING",
          },
        })

        // Send SMS to customer
        if (features.sms) {
          const message = `Refund of ${payment.amount} RWF has been initiated for order ${order.orderNumber}. You will receive it on your phone. FreedomCosmeticShop`
          enqueueSms(order.customerPhone, message, {
            priority: 1,
            template: "PROMOTIONAL",
          })
        }

        return NextResponse.json({
          success: true,
          refundReference: refundResult.transactionId,
          message: `Refund of ${payment.amount} RWF initiated to ${payment.phoneNumber}`,
        })
      } catch (err) {
        if (err instanceof PaypackError) {
          return NextResponse.json(
            { error: err.message },
            { status: err.statusCode }
          )
        }
        throw err
      }
    }

    // For CARD payments, would use Flutterwave refund (stub)
    if (payment.method === "CARD") {
      return NextResponse.json(
        { error: "Card refunds must be processed via Flutterwave dashboard" },
        { status: 400 }
      )
    }

    // For COD, no refund needed
    if (payment.method === "COD") {
      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: "REFUNDED",
          failureReason: "COD order cancelled — no refund needed",
        },
      })
      await db.order.update({
        where: { id: orderId },
        data: { status: "CANCELLED" },
      })

      return NextResponse.json({
        success: true,
        message: "COD order cancelled. No refund needed.",
      })
    }

    return NextResponse.json(
      { error: "Refund not supported for this payment method" },
      { status: 400 }
    )
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Refund error:", error)
    return NextResponse.json({ error: "Failed to process refund" }, { status: 500 })
  }
}
