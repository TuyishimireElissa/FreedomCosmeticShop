export const dynamic = 'force-dynamic'

/**
 * /api/admin/banners/[id]
 *
 * PUT    — Update a banner
 * DELETE — Delete a banner
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { DESTRUCTIVE_OPERATIONS, requireDestructiveOperation } from "@/lib/permissions"
import { broadcastBannerEvent } from "@/lib/realtime"
import { logActivity } from "@/server/services/activity"
import { z } from "zod"

const UpdateBannerSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  subtitle: z.string().max(500).optional().nullable(),
  image: z.string().url().optional(),
  mobileImage: z.string().url().optional().nullable(),
  linkType: z.string().optional().nullable(),
  linkUrl: z.string().optional().nullable(),
  placement: z
    .enum(["HOME_HERO", "HOME_PROMO", "SIDEBAR", "CATEGORY_TOP", "CHECKOUT_BANNER"])
    .optional(),
  startsAt: z.string().optional().nullable().transform((s) => (s ? new Date(s) : null)),
  endsAt: z.string().optional().nullable().transform((s) => (s ? new Date(s) : null)),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
})

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireRole("ADMIN")
    const { id } = await params
    const body = await req.json()

    const parsed = UpdateBannerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid banner data", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const existing = await db.banner.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Banner not found" }, { status: 404 })
    }

    const updated = await db.banner.update({ where: { id }, data: parsed.data })

    // ─── Section 4: Real-time broadcast ──────────────────────────────
    await broadcastBannerEvent("updated", {
      id: updated.id,
      title: updated.title,
      placement: updated.placement,
      isActive: updated.isActive,
    }, { source: adminUser.name })

    // Best-effort audit log
    void logActivity({
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      action: "BANNER_UPDATE",
      entityType: "BANNER",
      entityId: updated.id,
      description: `Updated banner: ${updated.title}`,
      req,
    }).catch(() => {})

    return NextResponse.json({ banner: updated })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Banner update error:", error)
    return NextResponse.json({ error: "Failed to update banner" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireDestructiveOperation(DESTRUCTIVE_OPERATIONS.MARKETING_DELETE)
    const { id } = await params

    const existing = await db.banner.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Banner not found" }, { status: 404 })
    }

    await db.banner.delete({ where: { id } })

    // ─── Section 4: Real-time broadcast ──────────────────────────────
    await broadcastBannerEvent("deleted", {
      id: existing.id,
      title: existing.title,
      placement: existing.placement,
      isActive: false,
    }, { source: adminUser.name })

    // Best-effort audit log
    void logActivity({
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      action: "BANNER_DELETE",
      entityType: "BANNER",
      entityId: existing.id,
      description: `Deleted banner: ${existing.title}`,
      req,
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Banner delete error:", error)
    return NextResponse.json({ error: "Failed to delete banner" }, { status: 500 })
  }
}
