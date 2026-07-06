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
 *   2. Initiate payment via PayPack API (or simulate in dev)
 *   3. Create/update Payment record with providerTransactionId
 *   4. Return transaction ID for client-side polling
 *
 * The client polls /api/payments/status/[txId] until status is PAID or FAILED.
 * PayPack webhook (/api/webhooks/paypack) updates the payment status.
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { env, features } from "@/lib/env"
import { normalizeRwandaPhone } from "@/lib/phone"

interface PaypackTokenResponse {
  access: string
  expires_in?: number
  token_type?: string
}

interface PaypackPaymentResponse {
  id: string
  ref: string
  status: "pending" | "success" | "failed"
  message?: string
  // ... other fields
}

/**
 * Get PayPack access token.
 * Expires after 1 hour — we fetch fresh on each request for simplicity.
 */
async function getPaypackToken(): Promise<string> {
  const res = await fetch("https://api.paypack.co.rw/api/auth/clients/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.PAYPACK_CLIENT_ID,
      client_secret: env.PAYPACK_CLIENT_SECRET,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`PayPack auth failed: ${err}`)
  }

  const data = (await res.json()) as PaypackTokenResponse
  return data.access
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { orderId, phone, network } = body as {
      orderId: string
      phone: string
      network: "MTN" | "AIRTEL"
    }

    if (!orderId || !phone) {
      return NextResponse.json(
        { error: "Order ID and phone are required" },
        { status: 400 }
      )
    }

    // Normalize phone
    let normalizedPhone: string
    try {
      normalizedPhone = normalizeRwandaPhone(phone)
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

    // ─── Simulation mode (MVP) ────────────────────────────────────────
    if (!features.realPayments || !env.PAYPACK_CLIENT_ID) {
      console.log(`[MOCK MoMo] ${network} ${order.total} RWF from ${normalizedPhone} for ${order.orderNumber}`)

      // Create/update payment record
      const payment = await db.payment.create({
        data: {
          orderId: order.id,
          method: network === "MTN" ? "MTN_MOMO" : "AIRTEL_MONEY",
          amount: order.total,
          status: "PENDING",
          phoneNumber: normalizedPhone,
          providerTransactionId: `mock-${Date.now()}`,
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
          console.log(`[MOCK MoMo] Payment ${payment.id} marked as PAID`)
        } catch (e) {
          console.error("Failed to update mock payment:", e)
        }
      }, 3000)

      return NextResponse.json({
        success: true,
        transactionId: payment.id,
        providerTransactionId: payment.providerTransactionId,
        status: "PENDING",
        message: "Payment prompt sent to your phone. (Simulated — will auto-confirm in 3 seconds.)",
        simulated: true,
      })
    }

    // ─── Real PayPack integration ─────────────────────────────────────
    try {
      const token = await getPaypackToken()

      // PayPack expects the phone in format 250XXXXXXXXX (no +)
      const paypackPhone = normalizedPhone.replace("+", "")

      const payRes = await fetch("https://api.paypack.co.rw/api/transactions/cash", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: order.total,
          number: paypackPhone,
          reference: order.orderNumber,
        }),
      })

      if (!payRes.ok) {
        const err = await payRes.text()
        throw new Error(`PayPack payment failed: ${err}`)
      }

      const payData = (await payRes.json()) as PaypackPaymentResponse

      // Create payment record
      const payment = await db.payment.create({
        data: {
          orderId: order.id,
          method: network === "MTN" ? "MTN_MOMO" : "AIRTEL_MONEY",
          amount: order.total,
          status: "PENDING",
          phoneNumber: normalizedPhone,
          providerTransactionId: payData.id,
          providerReference: payData.ref || order.orderNumber,
        },
      })

      return NextResponse.json({
        success: true,
        transactionId: payment.id,
        providerTransactionId: payData.id,
        status: payData.status.toUpperCase(),
        message: "Payment prompt sent to your phone. Approve it to complete the transaction.",
      })
    } catch (err) {
      console.error("PayPack error:", err)
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? err.message
              : "Payment initiation failed. Please try again.",
        },
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
