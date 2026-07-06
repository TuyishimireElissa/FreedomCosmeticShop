/**
 * POST /api/orders
 *
 * Creates a new order. Body:
 *   {
 *     customerName, customerPhone, customerEmail?, address, city, province,
 *     notes?, paymentMethod: "MTN_MOMO" | "COD",
 *     items: [{ productId, quantity }]
 *   }
 *
 * The server re-fetches product prices to prevent client-side tampering.
 * Generates a sequential order number like "UB-2026-00001".
 *
 * GET /api/orders
 * Returns all orders (for the admin dashboard). Sorted by createdAt desc.
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { deliveryFeeFor } from "@/lib/format"
import { z } from "zod"

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
  notes: z.string().max(500).optional(),
  paymentMethod: z.enum(["MTN_MOMO", "COD"]),
  items: z.array(OrderItemSchema).min(1, "Cart cannot be empty"),
})

/**
 * Generate a sequential, human-readable order number.
 * Format: UB-YYYY-XXXXX where XXXXX is a zero-padded counter.
 */
async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear()
  // Count orders this year to derive the sequence
  const countThisYear = await db.order.count({
    where: {
      orderNumber: { startsWith: `UB-${year}-` },
    },
  })
  const seq = String(countThisYear + 1).padStart(5, "0")
  return `UB-${year}-${seq}`
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Validate input
    const parsed = CreateOrderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid order data",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }
    const data = parsed.data

    // Fetch products from DB to get authoritative prices & stock
    const productIds = data.items.map((i) => i.productId)
    const products = await db.product.findMany({
      where: { id: { in: productIds }, isActive: true },
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

    const subtotal = orderItems.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    )
    const deliveryFee = deliveryFeeFor(data.province)
    const total = subtotal + deliveryFee
    const orderNumber = await generateOrderNumber()

    // Create the order in a transaction (also decrement stock)
    const order = await db.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerEmail: data.customerEmail || null,
          address: data.address,
          city: data.city,
          province: data.province,
          notes: data.notes || null,
          paymentMethod: data.paymentMethod,
          paymentStatus: data.paymentMethod === "COD" ? "PENDING" : "PENDING",
          status: "PENDING",
          subtotal,
          deliveryFee,
          total,
          items: {
            create: orderItems,
          },
        },
        include: { items: true },
      })

      // Decrement stock for each product
      for (const item of orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      }

      return created
    })

    return NextResponse.json({ order }, { status: 201 })
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
      include: { items: true },
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
