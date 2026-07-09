/**
 * POST /api/payments/card
 *
 * Initiate a card payment via Flutterwave.
 *
 * Body: { orderId }
 *
 * Flow:
 *   1. Fetch the order (verify it exists + is PENDING)
 *   2. Call Flutterwave initializePayment() to get a payment link
 *   3. Create/update Payment record with tx_ref
 *   4. Return the payment link for client-side redirect
 *
 * The customer is redirected to Flutterwave's secure payment page.
 * After payment, they're redirected back to the return_url.
 * Flutterwave webhook (/api/webhooks/flutterwave) updates the payment status.
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  initializePayment,
  generateTxRef,
  FlutterwaveError,
} from "@/server/services/flutterwave"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { orderId } = body as { orderId: string }

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 })
    }

    // Fetch the order
    const order = await db.order.findFirst({
      where: { id: orderId },
      include: { payments: true },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    if (order.status === "DELIVERED" || order.status === "CANCELLED") {
      return NextResponse.json(
        { error: `Order already ${order.status.toLowerCase()}` },
        { status: 400 }
      )
    }

    // Generate unique transaction reference
    const txRef = generateTxRef(order.orderNumber)

    // Create or find payment record
    let payment = order.payments.find((p) => p.method === "CARD" && p.status === "PENDING")

    if (payment) {
      payment = await db.payment.update({
        where: { id: payment.id },
        data: { providerTransactionId: txRef },
      })
    } else {
      payment = await db.payment.create({
        data: {
          orderId: order.id,
          method: "CARD",
          amount: order.total,
          status: "PENDING",
          providerTransactionId: txRef,
        },
      })
    }

    // ─── Simulation mode ──────────────────────────────────────────────
    const isSimulation = process.env.ENABLE_REAL_PAYMENTS !== "true"

    if (isSimulation) {
      console.log(`[MOCK CARD] ${order.total} RWF for ${order.orderNumber} — txRef: ${txRef}`)

      // Simulate payment success after 3 seconds
      setTimeout(async () => {
        try {
          const { handlePaymentSuccess } = await import("@/server/services/payment-events")
          await handlePaymentSuccess({
            paymentId: payment!.id,
            orderId: order.id,
            providerTransactionId: txRef,
            cardLast4: "4242",
            cardBrand: "visa",
          })
          console.log(`[MOCK CARD] Payment ${payment!.id} marked as PAID`)
        } catch (e) {
          console.error("Failed to update mock payment:", e)
        }
      }, 3000)

      return NextResponse.json({
        success: true,
        transactionId: payment.id,
        txRef,
        status: "PENDING",
        message: "Card payment initiated (simulated — will auto-confirm in 3 seconds).",
        simulated: true,
        paymentLink: null,
      })
    }

    // ─── Real Flutterwave integration ─────────────────────────────────
    try {
      const result = await initializePayment({
        amount: order.total,
        txRef,
        customer: {
          name: order.customerName,
          email: order.customerEmail || "customer@freedomcosmeticshop.rw",
          phone: order.customerPhone,
        },
        redirectUrl: `${process.env.APP_URL || "http://localhost:3000"}/checkout?tx_ref=${txRef}`,
      })

      return NextResponse.json({
        success: true,
        transactionId: payment.id,
        txRef,
        status: "PENDING",
        paymentLink: result.paymentLink,
        message: "Redirecting to secure payment page...",
        simulated: false,
      })
    } catch (err) {
      console.error("Flutterwave init error:", err)

      if (err instanceof FlutterwaveError) {
        return NextResponse.json(
          { error: err.message },
          { status: err.statusCode }
        )
      }

      return NextResponse.json(
        { error: "Card payment initiation failed." },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Card payment error:", error)
    return NextResponse.json(
      { error: "Failed to initiate payment" },
      { status: 500 }
    )
  }
}
