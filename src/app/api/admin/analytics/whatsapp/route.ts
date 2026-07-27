export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthError } from '@/lib/auth'
import { PERMISSIONS, requirePermission } from '@/lib/permissions'

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.ANALYTICS_READ)
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const [totalClicks, byTypeRows, byLanguageRows, clickDates, topRows] = await Promise.all([
      prisma.whatsAppClick.count({ where: { createdAt: { gte: since } } }),
      prisma.whatsAppClick.groupBy({ by: ['eventType'], where: { createdAt: { gte: since } }, _count: { _all: true }, orderBy: { _count: { eventType: 'desc' } } }),
      prisma.whatsAppClick.groupBy({ by: ['language'], where: { createdAt: { gte: since } }, _count: { _all: true } }),
      prisma.whatsAppClick.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true }, orderBy: { createdAt: 'asc' } }),
      prisma.whatsAppClick.groupBy({ by: ['productId', 'productSlug'], where: { createdAt: { gte: since }, productId: { not: null } }, _count: { _all: true }, orderBy: { _count: { productId: 'desc' } }, take: 10 }),
    ])
    const productIds = topRows.flatMap((row) => row.productId ? [row.productId] : [])
    const products = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, slug: true } })
    const days = new Map<string, number>()
    for (const click of clickDates) {
      const date = click.createdAt.toISOString().slice(0, 10)
      days.set(date, (days.get(date) || 0) + 1)
    }
    return NextResponse.json({ success: true, data: {
      totalClicks,
      byType: byTypeRows.map((row) => ({ eventType: row.eventType, count: row._count._all })),
      byLanguage: byLanguageRows.map((row) => ({ language: row.language, count: row._count._all })),
      byDay: [...days].map(([date, count]) => ({ date, count })),
      topProducts: topRows.flatMap((row) => {
        const product = products.find((item) => item.id === row.productId)
        return product ? [{ productId: product.id, productName: product.name, productSlug: product.slug, count: row._count._all }] : []
      }),
    } })
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    console.error('WhatsApp admin analytics failed:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ success: false, error: 'ANALYTICS_UNAVAILABLE' }, { status: 503 })
  }
}
