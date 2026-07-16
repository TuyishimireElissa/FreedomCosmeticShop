/**
 * POST /api/payments/momo
 *
 * Initiate an MTN MoMo or Airtel Money payment via PayPack.
 *
 * Body: { orderId, phone, network }
 *   - network: "MTN" | "AIRTEL"
 *
 * Flow:
 *   1. Fetch the order (verify it exists + is PENDING)
 *   2. Call PayPack cashin() to send USSD prompt to customer
 *   3. Update Payment record with providerTransactionId
 *   4. Return transaction ID for client-side polling
 *
 * The client polls /api/payments/status/[txId] until status is PAID or FAILED.
 * PayPack webhook (/api/webhooks/paypack) updates the payment status.
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { cashin, normalizePhoneForPaypack, PaypackError } from "@/server/services/paypack"
import { isValidForNetwork } from '@/lib/paypack'
import { validateOrderStockForPayment } from '@/server/services/payment-order-validation'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { orderId, phone, network } = body as {
      orderId: string
      phone: string
      network: "MTN" | "AIRTEL"
      language?: 'en' | 'rw'
    }
    const language = body.language === 'en' ? 'en' : 'rw'

    if (!orderId || !phone || (network !== 'MTN' && network !== 'AIRTEL')) {
      return NextResponse.json(
        { error: "Invalid payment request" },
        { status: 400 }
      )
    }
    if (!isValidForNetwork(phone, network)) {
      return NextResponse.json({ error: 'INVALID_NETWORK_PHONE' }, { status: 400 })
    }

    // Normalize phone
    let normalizedPhone: string
    try {
      normalizedPhone = normalizePhoneForPaypack(phone)
    } catch {
      return NextResponse.json(
        { error: "Invalid phone number. Use format 0788123456" },
        { status: 400 }
      )
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
    const stock = await validateOrderStockForPayment(order.id)
    if (!stock.available) return NextResponse.json({ error: 'ORDER_STOCK_CHANGED' }, { status: 409 })

    // ─── Simulation mode (MVP) ────────────────────────────────────────
    // When real payments are disabled, we still create the payment record
    // and simulate a successful payment after 3 seconds.
    const isSimulation = process.env.ENABLE_REAL_PAYMENTS !== "true"

    // Create or update payment record
    let payment = order.payments.find(
      (p) => p.method === (network === "MTN" ? "MTN_MOMO" : "AIRTEL_MONEY") && p.status === "PENDING"
    )

    if (payment) {
      // Update existing payment
      payment = await db.payment.update({
        where: { id: payment.id },
        data: {
          phoneNumber: normalizedPhone,
          webhookData: JSON.stringify({ checkoutLanguage: language }),
        },
      })
    } else {
      // Create new payment
      payment = await db.payment.create({
        data: {
          orderId: order.id,
          method: network === "MTN" ? "MTN_MOMO" : "AIRTEL_MONEY",
          amount: order.total,
          status: "PENDING",
          phoneNumber: normalizedPhone,
          webhookData: JSON.stringify({ checkoutLanguage: language }),
        },
      })
    }

    if (isSimulation) {
      console.log(`[MOCK MoMo] Initiated simulated payment for order ${order.orderNumber}`)

      // Simulate payment success after 3 seconds
      setTimeout(async () => {
        try {
          // Mark as paid + trigger post-payment actions
          const { handlePaymentSuccess } = await import("@/server/services/payment-events")
          await handlePaymentSuccess({
            paymentId: payment!.id,
            orderId: order.id,
            providerTransactionId: `mock-${Date.now()}`,
          })
          console.log(`[MOCK MoMo] Payment ${payment!.id} marked as PAID`)
        } catch (e) {
          console.error("Failed to update mock payment:", e)
        }
      }, 3000)

      return NextResponse.json({
        success: true,
        transactionId: payment.id,
        providerTransactionId: `mock-${Date.now()}`,
        status: "PENDING",
        message: `Payment prompt sent to your phone. (Simulated — will auto-confirm in 3 seconds.)`,
        simulated: true,
      })
    }

    // ─── Real PayPack integration ─────────────────────────────────────
    try {
      const result = await cashin({
        amount: order.total,
        phone: normalizedPhone,
        reference: order.orderNumber,
      })

      // Update payment with provider transaction ID
      await db.payment.update({
        where: { id: payment.id },
        data: {
          providerTransactionId: result.transactionId,
          providerReference: result.reference,
        },
      })

      return NextResponse.json({
        success: true,
        transactionId: payment.id,
        providerTransactionId: result.transactionId,
        status: result.status.toUpperCase(),
        message: result.message,
        simulated: result.simulated,
      })
    } catch (err) {
      console.error("PayPack cashin error:", err)

      if (err instanceof PaypackError) {
        return NextResponse.json(
          { error: err.message },
          { status: err.statusCode }
        )
      }

      return NextResponse.json(
        { error: "Payment initiation failed. Please try again." },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("MoMo payment error:", error)
    return NextResponse.json(
      { error: "Failed to initiate payment" },
      { status: 500 }
    )
  }
}
