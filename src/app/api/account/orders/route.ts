export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      include: {
        items: { include: { bundle: { select: { products: { select: { product: { select: { id: true, name: true } } } } } } } },
        payments: true,
        delivery: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    const serialized = orders.map((order) => {
      const reviewProducts = new Map<string, string>()
      for (const item of order.items) {
        if (item.productId) reviewProducts.set(item.productId, item.name)
        for (const component of item.bundle?.products || []) reviewProducts.set(component.product.id, component.product.name)
      }
      return { ...order, reviewProducts: [...reviewProducts].map(([id, name]) => ({ id, name })), paymentMethod: order.payments[0]?.method || 'COD', paymentStatus: order.payments[0]?.status || 'PENDING' }
    })
    return NextResponse.json({ success: true, data: { orders: serialized }, orders: serialized })
  } catch (error) {
    console.error('Account orders API error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 })
  }
}
