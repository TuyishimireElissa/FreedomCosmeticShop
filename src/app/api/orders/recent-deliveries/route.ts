export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/orders/recent-deliveries
 *
 * Public, unauthenticated feed for the homepage social-proof ticker.
 *
 * PRIVACY IS THE WHOLE DESIGN HERE. This endpoint is world-readable, so it
 * returns a district name and a timestamp and NOTHING else — no customer name,
 * no phone, no order number, no items, no totals, not even an id. "Somebody in
 * Musanze received an order" is the entire claim, which is exactly what a
 * social-proof ticker needs and the most it is entitled to.
 *
 * A district alone is not identifying: the smallest Rwandan district still has
 * tens of thousands of people. Pairing it with an order number or a name would
 * be, which is why neither is selected rather than merely omitted from the
 * response shape — a future `select: undefined` slip cannot leak what was
 * never queried.
 *
 * Only DELIVERED counts. CONFIRMED means the owner accepted the order, not
 * that anyone received anything; claiming otherwise would be a fabricated
 * delivery. There are 0 delivered orders today, so this returns an empty array
 * and the ticker hides itself.
 */

const CACHE = 'public, s-maxage=120, stale-while-revalidate=600'

export async function GET() {
  try {
    const rows = await prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        // A blank district would render "Delivered to " — worse than nothing.
        district: { not: null },
      },
      // deliveredAt is nullable on older rows; updatedAt is when the status
      // last moved, which for a DELIVERED order is when it was delivered.
      orderBy: { updatedAt: 'desc' },
      take: 3,
      select: { district: true, updatedAt: true },
    })

    const data = rows
      .filter((row) => (row.district || '').trim().length > 0)
      .map((row) => ({ district: row.district as string, at: row.updatedAt.toISOString() }))

    const response = NextResponse.json({ success: true, data })
    response.headers.set('Cache-Control', CACHE)
    return response
  } catch (error) {
    console.error('Recent deliveries API error:', error)
    // Social proof is decorative. A failure hides the ticker; it never breaks
    // the homepage.
    return NextResponse.json({ success: true, data: [] }, { status: 200, headers: { 'Cache-Control': CACHE } })
  }
}
