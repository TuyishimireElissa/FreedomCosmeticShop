export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/visitors?range=now|hour|today|week|month
 *
 * Live visitor dashboard feed. Admin only, using the existing permission
 * helper. "Live" is computed from lastSeenAt rather than in-memory connection
 * counts, so the number stays correct across serverless instances.
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PERMISSIONS, requirePermission } from '@/lib/permissions'
import { rangeStart, VISITOR_ONLINE_WINDOW_MS, type VisitorRange } from '@/lib/visitor-tracking'

const RANGES: VisitorRange[] = ['now', 'hour', 'today', 'week', 'month']
const noStore = { 'Cache-Control': 'private, no-store, max-age=0' }

export async function GET(request: Request) {
  try {
    await requirePermission(PERMISSIONS.ANALYTICS_READ)

    const requested = new URL(request.url).searchParams.get('range') || 'today'
    const range: VisitorRange = RANGES.includes(requested as VisitorRange) ? (requested as VisitorRange) : 'today'
    const now = new Date()
    const since = rangeStart(range, now)
    const onlineSince = new Date(now.getTime() - VISITOR_ONLINE_WINDOW_MS)
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0)
    const startOfWeek = new Date(now); startOfWeek.setDate(startOfWeek.getDate() - 7)
    const startOfMonth = new Date(now); startOfMonth.setMonth(startOfMonth.getMonth() - 1)

    const [liveCount, todayCount, weekCount, monthCount, sessions, districtGroups] = await Promise.all([
      prisma.visitorSession.count({ where: { lastSeenAt: { gte: onlineSince } } }),
      prisma.visitorSession.count({ where: { startedAt: { gte: startOfDay } } }),
      prisma.visitorSession.count({ where: { startedAt: { gte: startOfWeek } } }),
      prisma.visitorSession.count({ where: { startedAt: { gte: startOfMonth } } }),
      prisma.visitorSession.findMany({
        where: range === 'now' ? { lastSeenAt: { gte: since } } : { startedAt: { gte: since } },
        orderBy: { lastSeenAt: 'desc' },
        take: 200,
        include: { location: true },
      }),
      prisma.visitorSession.groupBy({
        by: ['ipDistrict'],
        where: { startedAt: { gte: startOfMonth }, ipDistrict: { not: null } },
        _count: { ipDistrict: true },
        orderBy: { _count: { ipDistrict: 'desc' } },
        take: 30,
      }),
    ])

    const rows = sessions.map((session) => ({
      id: session.id,
      country: session.country,
      // IP-derived: approximate. The visitor-submitted value wins when present.
      province: session.location?.province || session.ipProvince,
      district: session.location?.district || session.ipDistrict,
      sector: session.location?.sector ?? null,
      cell: session.location?.cell ?? null,
      village: session.location?.village ?? null,
      isPreciseLocation: Boolean(session.location),
      device: session.device,
      browser: session.browser,
      referrer: session.referrer,
      currentPath: session.currentPath,
      pageViews: session.pageViews,
      startedAt: session.startedAt.toISOString(),
      lastSeenAt: session.lastSeenAt.toISOString(),
      secondsOnSite: Math.max(0, Math.round((session.lastSeenAt.getTime() - session.startedAt.getTime()) / 1000)),
      isOnline: session.lastSeenAt >= onlineSince,
    }))

    return NextResponse.json({
      success: true,
      range,
      counts: { live: liveCount, today: todayCount, week: weekCount, month: monthCount },
      districts: districtGroups.map((group) => ({ district: group.ipDistrict, visitors: group._count.ipDistrict })),
      sessions: rows,
    }, { headers: noStore })
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return NextResponse.json({ success: false, error: error.message }, { status: (error as { statusCode: number }).statusCode, headers: noStore })
    }
    console.error('Admin visitors error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load visitors' }, { status: 500, headers: noStore })
  }
}
