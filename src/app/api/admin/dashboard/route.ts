import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

export async function GET() {
  try {
    await requireRole('ADMIN', 'MANAGER', 'STAFF')
    const [products, activeProducts, lowStock, orders, pendingOrders, customers, revenue, recentOrders] = await Promise.all([
      prisma.product.count({ where: { isDeleted: false } }), prisma.product.count({ where: { isDeleted: false, isActive: true } }), prisma.product.count({ where: { isDeleted: false, stock: { lte: 5 } } }), prisma.order.count(), prisma.order.count({ where: { status: 'PENDING' } }), prisma.user.count({ where: { isDeleted: false, role: 'CUSTOMER' } }), prisma.order.aggregate({ where: { status: 'DELIVERED' }, _sum: { total: true } }), prisma.order.findMany({ take: 10, orderBy: { createdAt: 'desc' }, include: { items: true, payments: true } }),
    ])
    const dashboard = { products: { total: products, active: activeProducts, lowStock }, orders: { total: orders, pending: pendingOrders, revenue: revenue._sum.total || 0 }, customers: { total: customers }, recentOrders }
    return NextResponse.json({ success: true, data: dashboard, ...dashboard })
  } catch (error) { const status = error instanceof Error && 'statusCode' in error ? Number((error as { statusCode: number }).statusCode) : 500; console.error('Admin dashboard API error:', error); return NextResponse.json({ success: false, error: status === 500 ? 'Failed to load dashboard' : (error as Error).message }, { status }) }
}
