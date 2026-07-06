/**
 * GET /api/payments/status/[txId]
 *
 * Poll the status of a payment by payment ID (internal).
 *
 * Returns:
 *   - 200: { status, payment, order }
 *   - 404: { error: "Payment not found" }
 *
 * The client polls this endpoint every 5 seconds after initiating MoMo/Card payment.
 * In production, the status is updated by PayPack/Flutterwave webhooks.
 * In simulation mode, the status is updated automatically after 3 seconds.
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ txId: string }> }
) {
  try {
    const { txId } = await params

    const payment = await db.payment.findUnique({
      where: { id: txId },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
            customerName: true,
            customerPhone: true,
            province: true,
          },
        },
      },
    })

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    return NextResponse.json({
      status: payment.status, // PENDING | PAID | FAILED
      payment: {
        id: payment.id,
        method: payment.method,
        amount: payment.amount,
        status: payment.status,
        providerTransactionId: payment.providerTransactionId,
        failureReason: payment.failureReason,
        initiatedAt: payment.initiatedAt,
        completedAt: payment.completedAt,
        cardLast4: payment.cardLast4,
        cardBrand: payment.cardBrand,
      },
      order: payment.order,
    })
  } catch (error) {
    console.error("Payment status error:", error)
    return NextResponse.json(
      { error: "Failed to fetch payment status" },
      { status: 500 }
    )
  }
}
