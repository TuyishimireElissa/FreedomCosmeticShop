export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { syncAbandonedCartReminder } from '@/server/services/retention-messaging'

function parseImages(value: string) { try { const images = JSON.parse(value); return Array.isArray(images) ? images.filter((image): image is string => typeof image === 'string') : [] } catch { return [] } }

const schema = z.object({
  // This endpoint intentionally replaces all Product-based server cart lines.
  items: z.array(z.object({
    productId: z.string().min(1).max(100),
    quantity: z.number().int().min(1).max(99),
  })).max(100),
})

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 })
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ success: false, error: 'INVALID_CART' }, { status: 400 })

    const requested = new Map<string, number>()
    for (const item of parsed.data.items) requested.set(item.productId, Math.min(99, (requested.get(item.productId) || 0) + item.quantity))
    const products = await prisma.product.findMany({
      where: { id: { in: [...requested.keys()] }, isActive: true, isDeleted: false },
      select: { id: true, name: true, slug: true, price: true, compareAt: true, stock: true, volume: true, images: true, category: { select: { slug: true } }, brand: { select: { name: true } }, productImages: { select: { url: true, publicId: true, altText: true, isPrimary: true, sortOrder: true }, orderBy: { sortOrder: 'asc' } } },
    })

    const accepted = products.flatMap((product) => {
      const quantity = Math.min(requested.get(product.id) || 0, product.stock)
      return quantity > 0 ? [{ product, quantity }] : []
    })
    const totalItems = accepted.reduce((sum, item) => sum + item.quantity, 0)
    const subtotal = accepted.reduce((sum, item) => sum + item.product.price * item.quantity, 0)

    const cart = await prisma.$transaction(async (tx) => {
      const current = await tx.cart.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} })
      await tx.cartItem.deleteMany({ where: { cartId: current.id } })
      if (accepted.length > 0) {
        await tx.cartItem.createMany({ data: accepted.map(({ product, quantity }) => ({ cartId: current.id, productId: product.id, quantity, price: product.price })) })
      }
      return tx.cart.update({ where: { id: current.id }, data: { totalItems, subtotal } })
    })

    await syncAbandonedCartReminder(user.id, cart).catch(() => null)

    const items = accepted.map(({ product, quantity }) => {
      const image = product.productImages.find((entry) => entry.isPrimary) || product.productImages[0]
      return {
        productId: product.id,
        quantity,
        price: product.price,
        product: {
          id: product.id, name: product.name, slug: product.slug, price: product.price, compareAt: product.compareAt,
          stock: product.stock, volume: product.volume, images: parseImages(product.images), category: product.category, brand: product.brand,
          productImages: image ? [image] : [],
        },
      }
    })
    const adjustments = [...requested.entries()].flatMap(([productId, quantity]) => {
      const acceptedItem = accepted.find((item) => item.product.id === productId)
      const acceptedQuantity = acceptedItem?.quantity || 0
      return acceptedQuantity === quantity ? [] : [{ productId, requestedQuantity: quantity, acceptedQuantity }]
    })

    return NextResponse.json({ success: true, mode: 'replace', data: { cart: { ...cart, items }, adjustments }, cart: { ...cart, items }, adjustments })
  } catch (error) {
    console.error('Cart sync error:', error)
    return NextResponse.json({ success: false, error: 'CART_SYNC_FAILED' }, { status: 500 })
  }
}
