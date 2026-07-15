export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

export async function GET() {
  try {
    await requireRole('ADMIN', 'SUPER_ADMIN')
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const searches = await prisma.searchLog.groupBy({
      by: ['query'],
      where: { hasResults: false, createdAt: { gte: thirtyDaysAgo } },
      _count: { _all: true },
      _max: { createdAt: true },
      orderBy: { _count: { query: 'desc' } },
      take: 50,
    })
    const data = searches.map((search) => ({
      query: search.query,
      count: search._count._all,
      lastSearched: search._max.createdAt?.toISOString() || null,
    }))
    const response = NextResponse.json({ success: true, data, periodDays: 30 })
    response.headers.set('Cache-Control', 'private, no-store')
    return response
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return NextResponse.json({ success: false, error: error.message }, { status: (error as { statusCode: number }).statusCode })
    }
    console.error('Admin zero-result searches error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch zero-result searches' }, { status: 500 })
  }
}
