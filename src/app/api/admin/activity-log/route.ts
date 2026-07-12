export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/activity-log
 *
 * Returns paginated audit log entries with filters.
 *
 * Query params:
 *   - action:  filter by action (e.g., "AUTH_LOGIN", "ORDER_UPDATE")
 *   - severity: filter by severity ("info" | "warn" | "critical")
 *   - userId:  filter by user
 *   - search:  search description / userName
 *   - page:    page number (default 1)
 *   - pageSize: items per page (default 50, max 200)
 *
 * Returns:
 *   - logs: ActivityLog[]
 *   - pagination: { page, pageSize, total, totalPages }
 *   - stats: { total, infoCount, warnCount, criticalCount, failedLogins24h }
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { Prisma } from "@prisma/client"

export async function GET(req: Request) {
  try {
    await requireRole("ADMIN")

    const { searchParams } = new URL(req.url)
    const action = searchParams.get("action")
    const severity = searchParams.get("severity")
    const userId = searchParams.get("userId")
    const search = searchParams.get("search")?.trim() || ""
    const page = Math.max(1, Number(searchParams.get("page") || "1"))
    const pageSize = Math.min(
      200,
      Math.max(1, Number(searchParams.get("pageSize") || "50"))
    )

    const where: Prisma.ActivityLogWhereInput = {}

    if (action && action !== "all") where.action = action
    if (severity && severity !== "all") where.severity = severity
    if (userId) where.userId = userId

    if (search) {
      where.OR = [
        { description: { contains: search } },
        { userName: { contains: search } },
      ]
    }

    const [logs, total, statsAgg] = await Promise.all([
      db.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.activityLog.count({ where }),
      // Aggregate counts for stats
      db.activityLog.groupBy({
        by: ["severity"],
        _count: true,
      }),
    ])

    // Failed logins in last 24h
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const failedLogins24h = await db.activityLog.count({
      where: {
        action: "AUTH_FAILED",
        createdAt: { gte: last24h },
      },
    })

    // Successful logins in last 24h
    const successfulLogins24h = await db.activityLog.count({
      where: {
        action: "AUTH_LOGIN",
        createdAt: { gte: last24h },
      },
    })

    // Unique users who logged in last 24h
    const recentLoginUsers = await db.activityLog.findMany({
      where: {
        action: "AUTH_LOGIN",
        createdAt: { gte: last24h },
      },
      select: { userId: true, userName: true, userRole: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
      distinct: ["userId"],
    })

    const severityMap: Record<string, number> = { info: 0, warn: 0, critical: 0 }
    for (const s of statsAgg) {
      severityMap[s.severity] = s._count
    }

    return NextResponse.json({
      logs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      stats: {
        total,
        infoCount: severityMap.info,
        warnCount: severityMap.warn,
        criticalCount: severityMap.critical,
        failedLogins24h,
        successfulLogins24h,
        recentLoginUsers,
      },
    })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Activity log error:", error)
    return NextResponse.json({ error: "Failed to fetch activity log" }, { status: 500 })
  }
}
