/**
 * POST /api/payments/card
 *
 * Initiate a card payment via Flutterwave.
 *
 * Body: { orderId }
 *
 * Flow:
 *   1. Fetch the order (verify it exists + is PENDING)
 *   2. Initiate Flutterwave Standard Payment (returns a payment link)
 *   3. Create Payment record
 *   4. Return the payment link for client-side redirect
 *
 * The customer is redirected to Flutterwave's secure payment page.
 * After payment, they're redirected back to the return_url.
 * Flutterwave webhook (/api/webhooks/flutterwave) updates the payment status.
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { env, features } from "@/lib/env"

interface FlutterwaveInitiateResponse {
  status: string
  message: string
  data: {
    link: string
    reference?: string
  }
}

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

    // ─── Simulation mode (MVP) ────────────────────────────────────────
    if (!features.realPayments || !env.FLW_SECRET_KEY) {
      console.log(`[MOCK CARD] ${order.total} RWF for ${order.orderNumber}`)

      const payment = await db.payment.create({
        data: {
          orderId: order.id,
          method: "CARD",
          amount: order.total,
          status: "PENDING",
          providerTransactionId: `mock-card-${Date.now()}`,
          providerReference: order.orderNumber,
        },
      })

      // Simulate payment success after 3 seconds
      setTimeout(async () => {
        try {
          await db.payment.update({
            where: { id: payment.id },
            data: {
              status: "PAID",
              completedAt: new Date(),
            },
          })
          console.log(`[MOCK CARD] Payment ${payment.id} marked as PAID`)
        } catch (e) {
          console.error("Failed to update mock payment:", e)
        }
      }, 3000)

      return NextResponse.json({
        success: true,
        transactionId: payment.id,
        status: "PENDING",
        message: "Card payment initiated (simulated — will auto-confirm in 3 seconds).",
        simulated: true,
        // In real mode, this would be the Flutterwave payment link
        paymentLink: null,
      })
    }

    // ─── Real Flutterwave integration ─────────────────────────────────
    const baseUrl = env.APP_URL || "http://localhost:3000"
    const txRef = `${order.orderNumber}-${Date.now()}`

    try {
      const flwRes = await fetch("https://api.flutterwave.com/v3/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.FLW_SECRET_KEY}`,
        },
        body: JSON.stringify({
          tx_ref: txRef,
          amount: order.total,
          currency: "RWF",
          redirect_url: `${baseUrl}/checkout?tx_ref=${txRef}`,
          customer: {
            name: order.customerName,
            phone_number: order.customerPhone,
            email: order.customerEmail || "customer@ubumwe.beauty",
          },
          customizations: {
            title: "Ubumwe Beauty",
            description: `Order ${order.orderNumber}`,
            logo: `${baseUrl}/logo.svg`,
          },
          payment_options: "card",
        }),
      })

      if (!flwRes.ok) {
        const err = await flwRes.text()
        throw new Error(`Flutterwave error: ${err}`)
      }

      const flwData = (await flwRes.json()) as FlutterwaveInitiateResponse

      if (flwData.status !== "success" || !flwData.data?.link) {
        throw new Error(flwData.message || "Flutterwave initiation failed")
      }

      // Create payment record
      const payment = await db.payment.create({
        data: {
          orderId: order.id,
          method: "CARD",
          amount: order.total,
          status: "PENDING",
          providerTransactionId: txRef,
          providerReference: flwData.data.reference || txRef,
        },
      })

      return NextResponse.json({
        success: true,
        transactionId: payment.id,
        status: "PENDING",
        paymentLink: flwData.data.link,
        message: "Redirecting to secure payment page...",
      })
    } catch (err) {
      console.error("Flutterwave error:", err)
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? err.message
              : "Card payment initiation failed.",
        },
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
