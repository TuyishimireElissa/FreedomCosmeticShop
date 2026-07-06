/**
 * GET /api/admin/deliveries
 *
 * List all deliveries with order info.
 *
 * Query params:
 *   - status: filter by delivery status
 *   - search: search by order number, customer name, driver name
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
    const search = searchParams.get("search")?.trim() || ""

    const where: Prisma.DeliveryWhereInput = {}

    if (status && status !== "all") {
      where.status = status
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

    return NextResponse.json({ deliveries, stats })
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
