import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const orders = await prisma.order.findMany({ where: { userId: user.id }, include: { items: true, payments: true, delivery: true }, orderBy: { createdAt: 'desc' } })
    const serialized = orders.map((order) => ({ ...order, paymentMethod: order.payments[0]?.method || 'COD', paymentStatus: order.payments[0]?.status || 'PENDING' }))
    return NextResponse.json({ success: true, data: { orders: serialized }, orders: serialized })
  } catch (error) {
    console.error('Account orders API error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 })
  }
}
