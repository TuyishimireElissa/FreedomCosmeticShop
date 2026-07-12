import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

const itemSchema = z.object({ productId: z.string().min(1), quantity: z.number().int().min(1).max(99) })
function fail(error: string, status: number) { return NextResponse.json({ success: false, error }, { status }) }
async function recalculate(cartId: string) { const items = await prisma.cartItem.findMany({ where: { cartId } }); const totalItems = items.reduce((sum, item) => sum + item.quantity, 0); const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0); return prisma.cart.update({ where: { id: cartId }, data: { totalItems, subtotal } }) }

export async function GET() {
  try {
    const user = await requireAuth(); if (!user) return fail('Unauthorized', 401)
    const cart = await prisma.cart.findUnique({ where: { userId: user.id }, include: { items: { include: { product: { include: { brand: true, category: true } } } } } })
    const data = cart ? { ...cart, items: cart.items.map((item) => ({ ...item, product: { ...item.product, images: safeParse(item.product.images) } })) } : { items: [], totalItems: 0, subtotal: 0 }
    return NextResponse.json({ success: true, data: { cart: data }, cart: data })
  } catch (error) { console.error('Cart GET error:', error); return fail('Failed to fetch cart', 500) }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth(); if (!user) return fail('Unauthorized', 401)
    const parsed = itemSchema.safeParse(await request.json()); if (!parsed.success) return fail('Invalid productId or quantity', 400)
    const product = await prisma.product.findFirst({ where: { id: parsed.data.productId, isActive: true, isDeleted: false } }); if (!product) return fail('Product not found', 404); if (product.stock < parsed.data.quantity) return fail('Insufficient stock', 400)
    const cart = await prisma.cart.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} })
    const existing = await prisma.cartItem.findUnique({ where: { cartId_productId: { cartId: cart.id, productId: product.id } } })
    const quantity = Math.min((existing?.quantity || 0) + parsed.data.quantity, product.stock)
    const item = existing ? await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity, price: product.price } }) : await prisma.cartItem.create({ data: { cartId: cart.id, productId: product.id, quantity, price: product.price } })
    const updated = await recalculate(cart.id)
    return NextResponse.json({ success: true, data: { item, cart: updated }, item, cart: updated }, { status: 201 })
  } catch (error) { console.error('Cart POST error:', error); return fail('Failed to add item to cart', 500) }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuth(); if (!user) return fail('Unauthorized', 401)
    const parsed = itemSchema.safeParse(await request.json()); if (!parsed.success) return fail('Invalid productId or quantity', 400)
    const cart = await prisma.cart.findUnique({ where: { userId: user.id } }); if (!cart) return fail('Cart not found', 404)
    const product = await prisma.product.findUnique({ where: { id: parsed.data.productId } }); if (!product || product.stock < parsed.data.quantity) return fail('Insufficient stock', 400)
    const item = await prisma.cartItem.update({ where: { cartId_productId: { cartId: cart.id, productId: product.id } }, data: { quantity: parsed.data.quantity, price: product.price } })
    const updated = await recalculate(cart.id)
    return NextResponse.json({ success: true, data: { item, cart: updated }, item, cart: updated })
  } catch (error) { console.error('Cart PATCH error:', error); return fail('Failed to update cart', 500) }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAuth(); if (!user) return fail('Unauthorized', 401)
    const cart = await prisma.cart.findUnique({ where: { userId: user.id } }); if (!cart) return NextResponse.json({ success: true, data: { cart: null } })
    const body = await request.json().catch(() => ({})) as { productId?: string }
    if (body.productId) await prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId: body.productId } }); else await prisma.cartItem.deleteMany({ where: { cartId: cart.id } })
    const updated = await recalculate(cart.id)
    return NextResponse.json({ success: true, data: { cart: updated }, cart: updated })
  } catch (error) { console.error('Cart DELETE error:', error); return fail('Failed to remove cart item', 500) }
}
function safeParse(value: string) { try { return JSON.parse(value) } catch { return [] } }
