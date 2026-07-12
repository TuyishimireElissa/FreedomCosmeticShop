export const dynamic = 'force-dynamic'

/**
 * /api/admin/delivery-zones
 *
 * GET  — List all delivery zone settings (from code defaults + DB overrides)
 * PUT  — Update a zone's fee, threshold, cutoff, active status (admin only)
 */
import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"
import { getAllZones } from "@/server/services/delivery.service"
import { db } from "@/lib/db"
import { broadcastDeliveryEvent } from "@/lib/realtime"
import { logActivity } from "@/server/services/activity"
import { z } from "zod"

const UpdateZoneSchema = z.object({
  zoneCode: z.string(),
  baseFee: z.number().int().min(0).optional(),
  freeThreshold: z.number().int().min(0).optional(),
  estimatedDays: z.number().int().min(0).optional(),
  isSameDay: z.boolean().optional(),
  sameDayCutoff: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

export async function GET() {
  try {
    await requireRole("ADMIN")

    // Get code-based zones
    const codeZones = getAllZones()

    // Try to get DB overrides
    let dbZones: { zoneCode: string; baseFee: number; freeThreshold: number; isSameDay: boolean; sameDayCutoff: string | null; isActive: boolean; estimatedDays: number }[] = []
    try {
      dbZones = await db.deliveryZoneSettings.findMany()
    } catch {
      // Table might not exist yet — use code defaults
    }

    // Merge: DB overrides take precedence
    const zones = codeZones.map((zone) => {
      const dbZone = dbZones.find((dz) => dz.zoneCode === zone.code)
      return {
        ...zone,
        baseFee: dbZone?.baseFee ?? zone.fee,
        freeThreshold: dbZone?.freeThreshold ?? zone.freeThreshold,
        estimatedDays: dbZone?.estimatedDays ?? zone.estimatedDays,
        isSameDay: dbZone?.isSameDay ?? zone.isSameDay,
        sameDayCutoff: dbZone?.sameDayCutoff ?? null,
        isActive: dbZone?.isActive ?? true,
      }
    })

    return NextResponse.json({ zones })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Delivery zones GET error:", error)
    return NextResponse.json({ error: "Failed to fetch zones" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const adminUser = await requireRole("ADMIN")

    const body = await req.json()
    const parsed = UpdateZoneSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { zoneCode, ...updateData } = parsed.data

    // Upsert the zone setting
    const existing = await db.deliveryZoneSettings.findUnique({
      where: { zoneCode },
    })

    let zone
    if (existing) {
      zone = await db.deliveryZoneSettings.update({
        where: { zoneCode },
        data: updateData,
      })
    } else {
      // Get defaults from code
      const codeZones = getAllZones()
      const codeZone = codeZones.find((z) => z.code === zoneCode)
      if (!codeZone) {
        return NextResponse.json({ error: "Zone not found" }, { status: 404 })
      }

      zone = await db.deliveryZoneSettings.create({
        data: {
          zoneName: codeZone.name,
          zoneCode,
          baseFee: updateData.baseFee ?? codeZone.fee,
          freeThreshold: updateData.freeThreshold ?? codeZone.freeThreshold,
          estimatedDays: updateData.estimatedDays ?? codeZone.estimatedDays,
          isSameDay: updateData.isSameDay ?? codeZone.isSameDay,
          sameDayCutoff: updateData.sameDayCutoff ?? null,
          isActive: updateData.isActive ?? true,
        },
      })
    }

    // ─── Section 7: Real-time broadcast ──────────────────────────────
    // Notify all connected storefront clients that delivery fees changed.
    // Anyone in the checkout flow will see the new fee immediately.
    await broadcastDeliveryEvent("feeUpdated", {
      zoneCode: zone.zoneCode,
      baseFee: zone.baseFee,
      freeThreshold: zone.freeThreshold,
      estimatedDays: zone.estimatedDays,
      isSameDay: zone.isSameDay,
      isActive: zone.isActive,
    }, { source: adminUser.name })

    // Best-effort audit log
    void logActivity({
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      action: "SETTINGS_UPDATE",
      entityType: "DELIVERY",
      entityId: zone.zoneCode,
      description: `Updated delivery zone ${zone.zoneName}: fee=${zone.baseFee} RWF, freeThreshold=${zone.freeThreshold} RWF`,
      req,
    }).catch(() => {})

    return NextResponse.json({ zone })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Delivery zone PUT error:", error)
    return NextResponse.json({ error: "Failed to update zone" }, { status: 500 })
  }
}
