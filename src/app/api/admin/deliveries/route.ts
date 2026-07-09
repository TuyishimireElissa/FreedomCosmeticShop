/**
 * GET /api/admin/deliveries
 *
 * List all deliveries with order info.
 *
 * Query params:
 *   - status: filter by delivery status
 *   - province: filter by order province (Kigali City, Northern Province, etc.)
 *   - search: search by order number, customer name, driver name, driver phone
 *   - riderPhone: filter by rider phone (returns deliveries assigned to a specific rider)
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { Prisma } from "@prisma/client"

export async function GET(req: Request) {
  try {
    await requireRole("ADMIN")

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const province = searchParams.get("province")
    const riderPhone = searchParams.get("riderPhone")
    const search = searchParams.get("search")?.trim() || ""

    const where: Prisma.DeliveryWhereInput = {}

    if (status && status !== "all") {
      where.status = status
    }

    if (province && province !== "all") {
      where.order = { ...(where.order as Prisma.OrderWhereInput), province }
    }

    if (riderPhone) {
      where.driverPhone = riderPhone
    }

    if (search) {
      where.OR = [
        { order: { orderNumber: { contains: search } } },
        { order: { customerName: { contains: search } } },
        { driverName: { contains: search } },
        { driverPhone: { contains: search } },
      ]
    }

    const deliveries = await db.delivery.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            customerPhone: true,
            address: true,
            city: true,
            district: true,
            sector: true,
            province: true,
            total: true,
            status: true,
            items: { select: { name: true, quantity: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    })

    // Compute stats
    const stats = {
      total: deliveries.length,
      pending: deliveries.filter((d) => d.status === "PENDING").length,
      assigned: deliveries.filter((d) => d.status === "ASSIGNED").length,
      inTransit: deliveries.filter((d) => d.status === "IN_TRANSIT").length,
      delivered: deliveries.filter((d) => d.status === "DELIVERED").length,
      failed: deliveries.filter((d) => d.status === "FAILED").length,
    }

    // Rider workload: list of { driverName, driverPhone, vehiclePlate,
    //   activeCount (PENDING/ASSIGNED/PICKED_UP/IN_TRANSIT), doneCount (DELIVERED) }
    // Only counts riders with at least one delivery in current result set.
    const riderMap = new Map<
      string,
      {
        driverName: string
        driverPhone: string
        vehiclePlate: string | null
        activeCount: number
        doneCount: number
        failedCount: number
        lastAssignedAt: string | null
      }
    >()

    for (const d of deliveries) {
      if (!d.driverName || !d.driverPhone) continue
      const key = d.driverPhone
      const existing = riderMap.get(key) || {
        driverName: d.driverName,
        driverPhone: d.driverPhone,
        vehiclePlate: d.vehiclePlate,
        activeCount: 0,
        doneCount: 0,
        failedCount: 0,
        lastAssignedAt: null,
      }
      if (d.status === "DELIVERED") {
        existing.doneCount++
      } else if (d.status === "FAILED") {
        existing.failedCount++
      } else {
        existing.activeCount++
      }
      if (d.assignedAt) {
        const ts = d.assignedAt.toISOString()
        if (!existing.lastAssignedAt || ts > existing.lastAssignedAt) {
          existing.lastAssignedAt = ts
        }
      }
      if (!existing.vehiclePlate && d.vehiclePlate) {
        existing.vehiclePlate = d.vehiclePlate
      }
      riderMap.set(key, existing)
    }

    const riders = Array.from(riderMap.values()).sort(
      (a, b) => b.activeCount - a.activeCount || b.doneCount - a.doneCount
    )

    return NextResponse.json({ deliveries, stats, riders })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Admin deliveries error:", error)
    return NextResponse.json({ error: "Failed to fetch deliveries" }, { status: 500 })
  }
}
