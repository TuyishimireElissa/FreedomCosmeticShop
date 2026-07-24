export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { syncAbandonedCartReminder } from '@/server/services/retention-messaging'

const schema = z.object({ productId: z.string().min(1), quantity: z.number().int().min(1).max(99).default(1) })

export async function POST(request: Request) {
  try {
    const user = await requireAuth(); if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const parsed = schema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid productId or quantity' }, { status: 400 })
    const product = await prisma.product.findFirst({ where: { id: parsed.data.productId, isActive: true, isDeleted: false } }); if (!product) return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 }); const unitPrice = user.wholesaleStatus === 'APPROVED' && product.wholesalePrice ? product.wholesalePrice : product.price; if (product.stock < parsed.data.quantity) return NextResponse.json({ success: false, error: 'Insufficient stock' }, { status: 400 })
    const cart = await prisma.cart.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} })
    const existing = await prisma.cartItem.findUnique({ where: { cartId_productId: { cartId: cart.id, productId: product.id } } })
    const quantity = Math.min((existing?.quantity || 0) + parsed.data.quantity, product.stock)
    const item = existing ? await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity, price: unitPrice } }) : await prisma.cartItem.create({ data: { cartId: cart.id, productId: product.id, quantity, price: unitPrice } })
    const items = await prisma.cartItem.findMany({ where: { cartId: cart.id } }); const totalItems = items.reduce((sum, value) => sum + value.quantity, 0); const subtotal = items.reduce((sum, value) => sum + value.price * value.quantity, 0); const updated = await prisma.cart.update({ where: { id: cart.id }, data: { totalItems, subtotal } })
    await syncAbandonedCartReminder(user.id, updated).catch(() => null)
    return NextResponse.json({ success: true, data: { item, totalItems, subtotal }, item, totalItems, subtotal }, { status: 201 })
  } catch (error) { console.error('Cart add error:', error); return NextResponse.json({ success: false, error: 'Failed to add item to cart' }, { status: 500 }) }
}
