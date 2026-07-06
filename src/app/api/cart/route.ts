/**
 * Cart API — for authenticated users (server-side cart).
 * Guest carts are managed client-side via Zustand + localStorage.
 *
 * GET  /api/cart — get user's cart
 * POST /api/cart — add item to cart (body: { productId, quantity })
 * DELETE /api/cart — clear cart
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import { z } from "zod"

const AddItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
})

export async function GET() {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const cart = await db.cart.findUnique({
      where: { userId: user.id },
      include: {
        items: { include: { product: { include: { brand: true } } } },
      },
    })

    if (!cart) {
      return NextResponse.json({ cart: { items: [], totalItems: 0, subtotal: 0 } })
    }

    const serialized = {
      ...cart,
      items: cart.items.map((item) => ({
        ...item,
        product: {
          ...item.product,
          images: JSON.parse(item.product.images),
        },
      })),
    }

    return NextResponse.json({ cart: serialized })
  } catch (error) {
    console.error("Cart GET error:", error)
    return NextResponse.json({ error: "Failed to fetch cart" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const parsed = AddItemSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    const { productId, quantity } = parsed.data

    const product = await db.product.findFirst({
      where: { id: productId, isActive: true, isDeleted: false },
    })
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 })
    if (product.stock < quantity) {
      return NextResponse.json({ error: "Insufficient stock" }, { status: 400 })
    }

    // Get or create cart
    let cart = await db.cart.findUnique({ where: { userId: user.id } })
    if (!cart) {
      cart = await db.cart.create({ data: { userId: user.id } })
    }

    // Check if item already exists
    const existing = await db.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    })

    if (existing) {
      const newQty = Math.min(existing.quantity + quantity, product.stock)
      await db.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQty },
      })
    } else {
      await db.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity: Math.min(quantity, product.stock),
          price: product.price,
        },
      })
    }

    // Recalculate totals
    const items = await db.cartItem.findMany({ where: { cartId: cart.id } })
    const totalItems = items.reduce((s, i) => s + i.quantity, 0)
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
    await db.cart.update({
      where: { id: cart.id },
      data: { totalItems, subtotal },
    })

    return NextResponse.json({ success: true, totalItems, subtotal })
  } catch (error) {
    console.error("Cart POST error:", error)
    return NextResponse.json({ error: "Failed to add to cart" }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const cart = await db.cart.findUnique({ where: { userId: user.id } })
    if (cart) {
      await db.cartItem.deleteMany({ where: { cartId: cart.id } })
      await db.cart.update({
        where: { id: cart.id },
        data: { totalItems: 0, subtotal: 0 },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Cart DELETE error:", error)
    return NextResponse.json({ error: "Failed to clear cart" }, { status: 500 })
  }
}
