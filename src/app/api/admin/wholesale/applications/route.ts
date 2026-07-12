export const dynamic = 'force-dynamic'

/** GET /api/admin/wholesale/applications — list all applications with filters */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/auth"

export async function GET(req: Request) {
  try {
    await requireRole("ADMIN")
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") || "all"
    const search = searchParams.get("search") || ""

    const where: Record<string, unknown> = {}
    if (status !== "all") where.status = status
    if (search) {
      where.OR = [
        { businessName: { contains: search } },
        { businessPhone: { contains: search } },
      ]
    }

    const applications = await db.wholesaleApplication.findMany({
      where,
      orderBy: { appliedAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, phone: true, email: true, avatar: true },
        },
      },
    })

    const counts = await db.wholesaleApplication.groupBy({
      by: ["status"],
      _count: true,
    })

    return NextResponse.json({
      applications,
      counts: counts.reduce((acc, c) => {
        acc[c.status] = c._count
        return acc
      }, {} as Record<string, number>),
    })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json({ error: error.message }, { status: (error as { statusCode: number }).statusCode })
    }
    return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 })
  }
}
