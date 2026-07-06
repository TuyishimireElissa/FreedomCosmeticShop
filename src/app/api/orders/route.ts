/**
 * POST /api/orders
 *
 * Creates a new order + payment + delivery records.
 *
 * Body:
 *   {
 *     customerName, customerPhone, customerEmail?, address, city, province,
 *     district?, sector?, cell?, landmark?, notes?,
 *     paymentMethod: "MTN_MOMO" | "AIRTEL_MONEY" | "CARD" | "COD" | "BANK_TRANSFER",
 *     items: [{ productId, quantity }],
 *     couponCode?: string,
 *     redeemLoyaltyPoints?: number
 *   }
 *
 * The server:
 *   1. Re-fetches product prices (no client-side tampering)
 *   2. Validates coupon (if provided)
 *   3. Calculates discount + delivery fee
 *   4. Handles loyalty points redemption (1 point = 10 RWF)
 *   5. Creates Order + OrderItem + Payment + Delivery in a transaction
 *   6. Increments coupon usage count
 *   7. Awards loyalty points (1 point per 1000 RWF)
 *   8. Sends SMS confirmation (if enabled)
 *   9. Sends email confirmation (if enabled)
 *
 * GET /api/orders — list all orders (admin)
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { deliveryFeeFor, deliveryTimeFor } from "@/lib/format"
import { z } from "zod"
import { sendOrderStatusSms } from "@/server/services/sms"
import { sendOrderConfirmationEmail } from "@/server/services/email"
import { features } from "@/lib/env"

const OrderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
})

const CreateOrderSchema = z.object({
  customerName: z.string().min(2, "Name is too short").max(100),
  customerPhone: z
    .string()
    .min(9, "Phone number is too short")
    .max(20)
    .regex(/^[0-9+\-\s]+$/, "Phone contains invalid characters"),
  customerEmail: z.string().email().optional().or(z.literal("")),
  address: z.string().min(5, "Address is too short").max(300),
  city: z.string().min(2).max(100),
  province: z.string().min(2).max(100),
  district: z.string().max(100).optional(),
  sector: z.string().max(100).optional(),
  cell: z.string().max(100).optional(),
  landmark: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
  paymentMethod: z.enum(["MTN_MOMO", "AIRTEL_MONEY", "CARD", "COD", "BANK_TRANSFER"]),
  items: z.array(OrderItemSchema).min(1, "Cart cannot be empty"),
  couponCode: z.string().optional(),
  redeemLoyaltyPoints: z.number().int().min(0).optional(),
})

/** Loyalty point conversion rate: 1 point = 10 RWF */
const LOYALTY_POINT_VALUE_RWF = 10

async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const countThisYear = await db.order.count({
    where: { orderNumber: { startsWith: `UB-${year}-` } },
  })
  const seq = String(countThisYear + 1).padStart(5, "0")
  return `UB-${year}-${seq}`
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = CreateOrderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid order data", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const data = parsed.data

    // ─── Fetch products (authoritative prices) ─────────────────────────
    const productIds = data.items.map((i) => i.productId)
    const products = await db.product.findMany({
      where: { id: { in: productIds }, isActive: true, isDeleted: false },
    })

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: "One or more products are unavailable" },
        { status: 400 }
      )
    }

    // Validate stock + build line items
    const orderItems = data.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`)
      }
      return {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        image: JSON.parse(product.images)[0] || null,
      }
    })

    const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
    let deliveryFee = deliveryFeeFor(data.province)
    let discountAmount = 0
    let couponId: string | null = null
    let loyaltyDiscount = 0
    let loyaltyPointsEarned = 0

    // ─── Validate + apply coupon ───────────────────────────────────────
    if (data.couponCode) {
      const coupon = await db.coupon.findFirst({
        where: {
          code: data.couponCode.toUpperCase().trim(),
          isActive: true,
        },
      })

      if (coupon) {
        const now = new Date()
        const isWithinWindow =
          (!coupon.startsAt || coupon.startsAt <= now) &&
          (!coupon.endsAt || coupon.endsAt >= now)
        const isWithinUsage = !coupon.usageLimit || coupon.usedCount < coupon.usageLimit
        const meetsMinOrder = !coupon.minOrderAmount || subtotal >= coupon.minOrderAmount

        if (isWithinWindow && isWithinUsage && meetsMinOrder) {
          if (coupon.type === "PERCENTAGE") {
            discountAmount = Math.round((subtotal * coupon.value) / 100)
            if (coupon.maxDiscountAmount) {
              discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount)
            }
          } else if (coupon.type === "FIXED") {
            discountAmount = coupon.value
          } else if (coupon.type === "FREE_SHIPPING") {
            deliveryFee = 0
          }
          couponId = coupon.id
        }
      }
    }

    // ─── Apply loyalty points redemption ───────────────────────────────
    if (data.redeemLoyaltyPoints && data.redeemLoyaltyPoints > 0) {
      // In MVP, we allow redemption without auth check (would need auth for real)
      loyaltyDiscount = Math.min(
        data.redeemLoyaltyPoints * LOYALTY_POINT_VALUE_RWF,
        subtotal - discountAmount + deliveryFee
      )
    }

    const total = Math.max(
      0,
      subtotal - discountAmount - loyaltyDiscount + deliveryFee
    )

    // ─── Loyalty points earned (1 per 1000 RWF) ───────────────────────
    loyaltyPointsEarned = Math.floor(total / 1000)

    const orderNumber = await generateOrderNumber()

    // ─── Create order in a transaction ─────────────────────────────────
    const order = await db.$transaction(async (tx) => {
      // 1. Create order
      const created = await tx.order.create({
        data: {
          orderNumber,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerEmail: data.customerEmail || null,
          address: data.address,
          city: data.city,
          province: data.province,
          district: data.district || null,
          sector: data.sector || null,
          notes: [data.cell, data.landmark, data.notes]
            .filter(Boolean)
            .join(" | ") || null,
          subtotal,
          discountAmount: discountAmount + loyaltyDiscount,
          deliveryFee,
          total,
          couponId,
          loyaltyPointsEarned,
          status: "PENDING",
          items: { create: orderItems },
        },
        include: { items: true },
      })

      // 2. Create payment record
      await tx.payment.create({
        data: {
          orderId: created.id,
          method: data.paymentMethod,
          amount: total,
          status:
            data.paymentMethod === "COD" || data.paymentMethod === "BANK_TRANSFER"
              ? "PENDING"
              : "PENDING",
          phoneNumber:
            data.paymentMethod === "MTN_MOMO" || data.paymentMethod === "AIRTEL_MONEY"
              ? data.customerPhone
              : null,
        },
      })

      // 3. Create delivery record with estimated arrival
      const eta = new Date()
      if (data.province === "Kigali City") {
        eta.setDate(eta.getDate() + 1) // Next day
      } else {
        eta.setDate(eta.getDate() + 4) // 3-5 days
      }
      await tx.delivery.create({
        data: {
          orderId: created.id,
          status: "PENDING",
          estimatedArrival: eta,
        },
      })

      // 4. Decrement stock
      for (const item of orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      }

      // 5. Increment coupon usage
      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { usedCount: { increment: 1 } },
        })
      }

      return created
    })

    // ─── Send confirmations (async, non-blocking) ──────────────────────
    const etaText = deliveryTimeFor(data.province)

    if (features.sms) {
      sendOrderStatusSms(data.customerPhone, orderNumber, "PENDING").catch((e) =>
        console.error("SMS failed:", e)
      )
    }

    if (features.email && data.customerEmail) {
      sendOrderConfirmationEmail(data.customerEmail, orderNumber, total).catch((e) =>
        console.error("Email failed:", e)
      )
    }

    return NextResponse.json(
      {
        order,
        estimatedDelivery: etaText,
        loyaltyPointsEarned,
        message: "Order placed successfully!",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Failed to create order:", error)
    const message =
      error instanceof Error ? error.message : "Failed to create order"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")

    const orders = await db.order.findMany({
      where: status && status !== "all" ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      include: { items: true, payments: true, delivery: true },
      take: 200,
    })

    return NextResponse.json({ orders })
  } catch (error) {
    console.error("Failed to fetch orders:", error)
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    )
  }
}
