export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/visitors/export?range=now|hour|today|week|month
 *
 * CSV of the anonymous visitor sessions shown on the dashboard. Admin only.
 * Contains no identifiers: place names, device, browser, referrer channel and
 * timings only.
 */
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { PERMISSIONS, requirePermission } from '@/lib/permissions'
import { rangeStart, type VisitorRange } from '@/lib/visitor-tracking'

const RANGES: VisitorRange[] = ['now', 'hour', 'today', 'week', 'month']
const NOT_PROVIDED = 'Not provided'

/** Guards against CSV formula injection in spreadsheet software. */
function csvCell(value: string | number | null | undefined) {
  const raw = value === null || value === undefined || value === '' ? '' : String(value)
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw
  return `"${safe.replace(/"/g, '""')}"`
}

export async function GET(request: Request) {
  try {
    await requirePermission(PERMISSIONS.ANALYTICS_READ)

    const requested = new URL(request.url).searchParams.get('range') || 'today'
    const range: VisitorRange = RANGES.includes(requested as VisitorRange) ? (requested as VisitorRange) : 'today'
    const since = rangeStart(range)

    const sessions = await prisma.visitorSession.findMany({
      where: range === 'now' ? { lastSeenAt: { gte: since } } : { startedAt: { gte: since } },
      orderBy: { lastSeenAt: 'desc' },
      take: 5000,
      include: { location: true },
    })

    const header = [
      'Country', 'Province', 'District', 'Sector', 'Cell', 'Village',
      'Location source', 'Device', 'Browser', 'Referrer', 'Current page',
      'Page views', 'Seconds on site', 'Started at', 'Last seen at',
    ]
    const lines = [header.map(csvCell).join(',')]

    for (const session of sessions) {
      lines.push([
        csvCell(session.country || NOT_PROVIDED),
        csvCell(session.location?.province || session.ipProvince || NOT_PROVIDED),
        csvCell(session.location?.district || session.ipDistrict || NOT_PROVIDED),
        csvCell(session.location?.sector || NOT_PROVIDED),
        csvCell(session.location?.cell || NOT_PROVIDED),
        csvCell(session.location?.village || NOT_PROVIDED),
        csvCell(session.location ? 'Visitor provided' : 'IP estimate'),
        csvCell(session.device || NOT_PROVIDED),
        csvCell(session.browser || NOT_PROVIDED),
        csvCell(session.referrer || 'Direct'),
        csvCell(session.currentPath || NOT_PROVIDED),
        csvCell(session.pageViews),
        csvCell(Math.max(0, Math.round((session.lastSeenAt.getTime() - session.startedAt.getTime()) / 1000))),
        csvCell(session.startedAt.toISOString()),
        csvCell(session.lastSeenAt.toISOString()),
      ].join(','))
    }

    const filename = `visitors-${range}-${new Date().toISOString().slice(0, 10)}.csv`
    return new NextResponse(lines.join('\r\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store, max-age=0',
      },
    })
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return NextResponse.json({ success: false, error: error.message }, { status: (error as { statusCode: number }).statusCode })
    }
    console.error('Visitor export error:', error)
    return NextResponse.json({ success: false, error: 'Export failed' }, { status: 500 })
  }
}
