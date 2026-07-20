export const dynamic = 'force-dynamic'

/**
 * POST /api/orders
 *
 * Creates a new order + payment record. Body:
 *   {
 *     customerName, customerPhone, customerEmail?, address, city, province,
 *     district?, sector?, cell?, landmark?, notes?,
 *     paymentMethod: "MTN_MOMO" | "AIRTEL_MONEY" | "CARD" | "COD" | "BANK_TRANSFER",
 *     couponCode?, useLoyaltyPoints?,
 *     items: [{ productId, quantity }]
 *   }
 *
 * The server re-fetches product prices to prevent client-side tampering.
 * Generates a sequential order number like "UB-2026-00001".
 * Also creates a Payment record + Delivery record.
 * Sends SMS confirmation if enabled.
 *
 * GET /api/orders
 * Returns all orders (for the admin dashboard). Sorted by createdAt desc.
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { deliveryFeeFor } from "@/lib/format"
import { requireAuth } from "@/lib/auth"
import { z } from "zod"
import { getSmsMessage } from "@/server/services/sms-templates"
import { enqueueSms } from "@/server/services/sms-queue"
import { sendOrderConfirmationEmail } from "@/server/services/email"
import { features } from "@/lib/env"
import { broadcastOrderEvent } from "@/lib/realtime"
import { WHOLESALE_CONFIG } from "@/lib/wholesale-config"
import { cancelAbandonedCartReminder } from "@/server/services/retention-messaging"

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
  paymentMethod: z.enum(["MTN_MOMO", "AIRTEL_MONEY", "CARD", "COD", "BANK_TRANSFER", "CREDIT"]),
  couponCode: z.string().max(50).optional(),
  useLoyaltyPoints: z.number().int().min(0).optional(),
  items: z.array(OrderItemSchema).min(1, "Cart cannot be empty"),
  isWholesale: z.boolean().optional().default(false),
  wholesaleReorderId: z.string().min(1).optional(),
})

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

    // COD is Kigali only
    if (data.paymentMethod === "COD" && data.province !== "Kigali City") {
      return NextResponse.json(
        { error: "Cash on Delivery is only available in Kigali City" },
        { status: 400 }
      )
    }

    // Fetch products
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

    // ─── Section 2: Determine if this is a wholesale order ──────────
    let isWholesale = data.isWholesale || false
    const isCreditOrder = data.paymentMethod === "CREDIT"
    if (isCreditOrder && !WHOLESALE_CONFIG.credit.enabled) {
      return NextResponse.json({ error: "Wholesale credit is not enabled" }, { status: 400 })
    }
    let userId: string | null = null

    if (isWholesale || isCreditOrder) {
      // Verify user is authenticated + approved wholesale
      const authUser = await requireAuth()
      if (!authUser) {
        return NextResponse.json({ error: "Authentication required for wholesale orders" }, { status: 401 })
      }
      userId = authUser.id

      if (
        authUser.userType !== "WHOLESALE" &&
        authUser.userType !== "BOTH"
      ) {
        return NextResponse.json({ error: "Your account is not a wholesale account" }, { status: 403 })
      }
      if (authUser.wholesaleStatus !== "APPROVED") {
        return NextResponse.json({ error: "Your wholesale account is not approved" }, { status: 403 })
      }
      isWholesale = true
    }

    // Build line items (with wholesale pricing if applicable)
    const orderItems = await Promise.all(
      data.items.map(async (item) => {
        const product = products.find((p) => p.id === item.productId)!
        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}`)
        }

        let unitPrice = product.price

        // ─── Section 2: Apply wholesale pricing ─────────────────────
        if (isWholesale && product.wholesaleActive) {
          const { calculateWholesalePrice } = await import("@/server/services/wholesale")
          const result = await calculateWholesalePrice(product.id, item.quantity, userId || undefined)
          unitPrice = result.currentPrice
        }

        return {
          productId: product.id,
          name: product.name,
          price: unitPrice,
          quantity: item.quantity,
          image: JSON.parse(product.images)[0] || null,
        }
      })
    )

    const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0)

    // Enforce a basket minimum only after the owner explicitly configures one.
    const wholesaleMinimum = WHOLESALE_CONFIG.minimumOrderRwf
    if (isWholesale && wholesaleMinimum !== null && subtotal < wholesaleMinimum) {
      return NextResponse.json(
        { error: `Wholesale minimum order is ${wholesaleMinimum.toLocaleString()} RWF. Current subtotal: ${subtotal.toLocaleString()} RWF.` },
        { status: 400 }
      )
    }

    // ─── Section 2: Check credit limit for credit orders ────────────
    if (isCreditOrder && userId) {
      const { checkCreditLimit } = await import("@/server/services/wholesale")
      const creditCheck = await checkCreditLimit(userId, subtotal)
      if (!creditCheck.allowed) {
        return NextResponse.json(
          { error: creditCheck.message || "Insufficient credit limit" },
          { status: 400 }
        )
      }
    }

    let deliveryFee = deliveryFeeFor(data.province)
    let discountAmount = 0
    let couponId: string | null = null

    // ─── Apply coupon ─────────────────────────────────────────────
    if (data.couponCode) {
      const coupon = await db.coupon.findFirst({
        where: {
          code: data.couponCode.toUpperCase().trim(),
          isActive: true,
        },
      })
      if (coupon) {
        const now = new Date()
        const inWindow =
          (!coupon.startsAt || coupon.startsAt <= now) &&
          (!coupon.endsAt || coupon.endsAt >= now)
        const usageOk = !coupon.usageLimit || coupon.usedCount < coupon.usageLimit
        const minOk = !coupon.minOrderAmount || subtotal >= coupon.minOrderAmount

        if (inWindow && usageOk && minOk) {
          couponId = coupon.id
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
        }
      }
    }

    // ─── Apply loyalty points (1 point = 1 RWF) ────────────────────
    const loyaltyRedeemed = Math.min(data.useLoyaltyPoints || 0, discountAmount > 0 ? subtotal - discountAmount : subtotal)
    discountAmount += loyaltyRedeemed

    const total = Math.max(0, subtotal - discountAmount + deliveryFee)

    // Loyalty earned: 1 point per 1000 RWF spent
    const loyaltyPointsEarned = Math.floor(total / 1000)

    const orderNumber = await generateOrderNumber()

    // ─── Create everything in a transaction ────────────────────────
    const order = await db.$transaction(async (tx) => {
      // Merge landmark into address for storage
      const fullAddress = data.landmark
        ? `${data.address} (Landmark: ${data.landmark})`
        : data.address

      const created = await tx.order.create({
        data: {
          orderNumber,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerEmail: data.customerEmail || null,
          userId: userId || null,
          address: fullAddress,
          city: data.city,
          province: data.province,
          district: data.district || null,
          sector: data.sector || null,
          notes: data.notes || null,
          subtotal,
          discountAmount,
          deliveryFee,
          total,
          couponId,
          loyaltyPointsEarned,
          status: "PENDING",
          // ─── Section 2: Wholesale order fields ──────────────────────
          orderType: isWholesale ? "WHOLESALE" : "RETAIL",
          priceType: isWholesale ? "WHOLESALE" : "RETAIL",
          isCredit: isCreditOrder,
          creditDueDate: null,
          items: { create: orderItems },
        },
        include: { items: true },
      })

      // Payment record
      await tx.payment.create({
        data: {
          orderId: created.id,
          method: data.paymentMethod,
          amount: total,
          status: "PENDING",
          phoneNumber:
            data.paymentMethod === "MTN_MOMO" || data.paymentMethod === "AIRTEL_MONEY"
              ? data.customerPhone
              : null,
        },
      })

      // Delivery record with ETA
      await tx.delivery.create({
        data: {
          orderId: created.id,
          status: "PENDING",
          estimatedArrival: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        },
      })

      if (isWholesale && userId && data.wholesaleReorderId) {
        await tx.wholesaleReorder.updateMany({
          where: { id: data.wholesaleReorderId, userId, newOrderId: null },
          data: { newOrderId: created.id },
        })
      }

      // Increment coupon usage
      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { usedCount: { increment: 1 } },
        })
      }

      // Decrement stock
      for (const item of orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      }

      return created
    })

    if (userId) await cancelAbandonedCartReminder(userId).catch(() => null)

    // ─── Send confirmations (non-blocking) ─────────────────────────
    if (features.sms) {
      const message = getSmsMessage("ORDER_PLACED", "en", { orderNumber: order.orderNumber })
      enqueueSms(order.customerPhone, message, {
        priority: 0,
        template: "ORDER_PLACED",
      })
    }
    if (features.email && order.customerEmail) {
      sendOrderConfirmationEmail(order.customerEmail, order.orderNumber, order.total).catch(
        (e) => console.error("Email send failed:", e)
      )
    }

    // ─── Section 2: Generate wholesale invoice if wholesale order ────
    let invoice: { invoiceNumber: string; dueDate: Date | null } | null = null
    if (isWholesale) {
      try {
        const { generateWholesaleInvoice, sendWholesaleSms } = await import("@/server/services/wholesale")
        invoice = await generateWholesaleInvoice(order.id)
        // Send wholesale-specific SMS with invoice number
        if (features.sms && invoice) {
          await sendWholesaleSms(order.customerPhone, "order_confirmed", {
            orderNumber: order.orderNumber,
            amount: order.total,
            invoice: invoice.invoiceNumber,
          })
        }
      } catch (e) {
        console.error("Invoice generation failed:", e)
      }
    }

    // ─── Section 3: Broadcast new order to admin (real-time alert) ──
    // This fires the "order:new" event which the admin dashboard listens
    // for to play a sound alert + increment the pending count badge.
    await broadcastOrderEvent("new", {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      customerPhone: order.customerPhone,
      customerName: order.customerName,
      status: order.status,
      total: order.total,
    }, { source: "customer" })

    return NextResponse.json({ order }, { status: 201 })
  } catch (error) {
    console.error("Failed to create order:", error)
    const message = error instanceof Error ? error.message : "Failed to create order"
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
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
  }
}
