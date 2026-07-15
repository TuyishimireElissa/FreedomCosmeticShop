export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const EMAIL_OR_PHONE = /(?:[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?250|0)?7\d{8})/i

export async function GET() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const grouped = await prisma.searchLog.groupBy({
      by: ['query'],
      where: { hasResults: true, createdAt: { gte: thirtyDaysAgo } },
      _count: { _all: true },
      _max: { createdAt: true },
      orderBy: { _count: { query: 'desc' } },
      take: 30,
    })
    const searches = grouped
      .filter((entry) => entry.query.length >= 2 && entry.query.length <= 60 && !EMAIL_OR_PHONE.test(entry.query))
      .slice(0, 6)
      .map((entry) => ({ query: entry.query, count: entry._count._all, lastSearched: entry._max.createdAt?.toISOString() || null }))
    const response = NextResponse.json({ success: true, data: searches, periodDays: 30 })
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    return response
  } catch (error) {
    console.error('Popular search query failed:', error)
    return NextResponse.json({ success: false, data: [] }, { status: 500 })
  }
}
