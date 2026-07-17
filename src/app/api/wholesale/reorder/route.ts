export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { rateLimit } from '@/lib/permissions'
import { calculateWholesalePrice } from '@/server/services/wholesale'
import { refreshWholesaleRetentionMetric } from '@/server/services/wholesale-retention'

const ReorderSchema = z.object({ orderId: z.string().min(1) }).strict()

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    if (user.wholesaleStatus !== 'APPROVED' || (user.userType !== 'WHOLESALE' && user.userType !== 'BOTH')) {
      return NextResponse.json({ error: 'Wholesale account not approved' }, { status: 403 })
    }
    const limit = rateLimit(`wholesale-reorder:${user.id}`, { maxActions: 20, windowMs: 60_000 })
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many reorder requests' }, { status: 429, headers: { 'Retry-After': String(Math.ceil((limit.retryAfterMs || 1000) / 1000)) } })
    }

    const parsed = ReorderSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Invalid order' }, { status: 400 })

    const originalOrder = await db.order.findFirst({
      where: { id: parsed.data.orderId, userId: user.id, orderType: 'WHOLESALE' },
      select: {
        id: true,
        orderNumber: true,
        items: {
          select: {
            productId: true,
            quantity: true,
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: true,
                stock: true,
                isActive: true,
                isDeleted: true,
                wholesaleActive: true,
              },
            },
          },
        },
      },
    })
    if (!originalOrder) return NextResponse.json({ error: 'Wholesale order not found' }, { status: 404 })

    const items = []
    let unavailableCount = 0
    for (const originalItem of originalOrder.items) {
      const product = originalItem.product
      if (!originalItem.productId || !product || !product.isActive || product.isDeleted || product.stock < 1) {
        unavailableCount += 1
        continue
      }

      const quantity = Math.min(originalItem.quantity, product.stock, 99)
      const pricing = await calculateWholesalePrice(product.id, quantity, user.id)
      let images: string[] = []
      try { images = JSON.parse(product.images) as string[] } catch { images = [] }
      items.push({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: pricing.currentPrice,
        image: images[0] || '',
        stock: product.stock,
        quantity,
        priceType: pricing.priceType,
      })
    }

    if (items.length === 0) {
      return NextResponse.json({ error: 'No products from this order are currently available', unavailableCount }, { status: 409 })
    }

    const reorder = await db.wholesaleReorder.create({
      data: { userId: user.id, originalOrderId: originalOrder.id },
      select: { id: true, originalOrderId: true, createdAt: true },
    })

    await refreshWholesaleRetentionMetric(user.id)

    return NextResponse.json({
      reorder,
      originalOrderNumber: originalOrder.orderNumber,
      items,
      addedProductCount: items.length,
      unavailableCount,
    })
  } catch (error) {
    console.error('Wholesale reorder error:', error)
    return NextResponse.json({ error: 'Failed to prepare reorder' }, { status: 500 })
  }
}
