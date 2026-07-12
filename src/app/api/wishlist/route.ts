export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

const schema = z.object({ productId: z.string().min(1) })
const fail = (error: string, status: number) => NextResponse.json({ success: false, error }, { status })

export async function GET() {
  try {
    const user = await requireAuth(); if (!user) return fail('Unauthorized', 401)
    const rows = await prisma.wishlist.findMany({ where: { userId: user.id }, include: { product: { include: { brand: true, category: true } } }, orderBy: { createdAt: 'desc' } })
    const wishlist = rows.map((item) => ({ ...item, product: { ...item.product, images: safeParse(item.product.images), skinType: safeParse(item.product.skinType), shades: safeParse(item.product.shades), ingredients: safeParse(item.product.ingredients) } }))
    return NextResponse.json({ success: true, data: { wishlist }, wishlist })
  } catch (error) { console.error('Wishlist GET error:', error); return fail('Failed to fetch wishlist', 500) }
}
export async function POST(request: Request) {
  try {
    const user = await requireAuth(); if (!user) return fail('Unauthorized', 401)
    const parsed = schema.safeParse(await request.json()); if (!parsed.success) return fail('productId is required', 400)
    const product = await prisma.product.findFirst({ where: { id: parsed.data.productId, isActive: true, isDeleted: false } }); if (!product) return fail('Product not found', 404)
    const item = await prisma.wishlist.upsert({ where: { userId_productId: { userId: user.id, productId: product.id } }, create: { userId: user.id, productId: product.id }, update: {} })
    return NextResponse.json({ success: true, data: { item }, item }, { status: 201 })
  } catch (error) { console.error('Wishlist POST error:', error); return fail('Failed to add wishlist item', 500) }
}
export async function DELETE(request: Request) {
  try {
    const user = await requireAuth(); if (!user) return fail('Unauthorized', 401)
    const parsed = schema.safeParse(await request.json()); if (!parsed.success) return fail('productId is required', 400)
    await prisma.wishlist.deleteMany({ where: { userId: user.id, productId: parsed.data.productId } })
    return NextResponse.json({ success: true, data: { productId: parsed.data.productId } })
  } catch (error) { console.error('Wishlist DELETE error:', error); return fail('Failed to remove wishlist item', 500) }
}
function safeParse(value: string | null) { if (!value) return null; try { return JSON.parse(value) } catch { return [] } }
