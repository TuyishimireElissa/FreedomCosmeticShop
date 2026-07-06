/**
 * GET /api/payments/status/[txId]
 *
 * Poll the status of a payment by payment ID (internal).
 *
 * Returns:
 *   - 200: { status: "PENDING" | "PAID" | "FAILED", payment: {...} }
 *   - 404: { error: "Payment not found" }
 *
 * The client polls this endpoint every 2 seconds after initiating MoMo/Card payment.
 * In production, the status is updated by PayPack/Flutterwave webhooks.
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
      select: {
        id: true,
        status: true,
        method: true,
        amount: true,
        providerTransactionId: true,
        failureReason: true,
        initiatedAt: true,
        completedAt: true,
        orderId: true,
      },
    })

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    return NextResponse.json({
      status: payment.status,
      payment,
    })
  } catch (error) {
    console.error("Payment status error:", error)
    return NextResponse.json(
      { error: "Failed to fetch payment status" },
      { status: 500 }
    )
  }
}
