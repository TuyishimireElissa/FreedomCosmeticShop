export const dynamic = 'force-dynamic'

/**
 * /api/admin/brands/[id]
 *
 * PUT    — Update a brand (name, logo, isFeatured, isActive, etc.)
 * DELETE — Soft-delete a brand
 *
 * Section 6: Broadcasts brand:updated / brand:featured events.
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { broadcastBrandEvent } from "@/lib/realtime"
import { logActivity } from "@/server/services/activity"
import { z } from "zod"

const UpdateBrandSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  logo: z.string().url().optional().nullable(),
  country: z.string().optional().nullable(),
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
    const parsed = UpdateBrandSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid update", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const existing = await db.brand.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 })
    }

    const data: Record<string, unknown> = { ...parsed.data }
    if (parsed.data.name && parsed.data.name !== existing.name) {
      let slug = parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
      const slugExists = await db.brand.findFirst({ where: { slug, id: { not: id } } })
      if (slugExists) slug = `${slug}-${Date.now().toString(36)}`
      data.slug = slug
    }

    const updated = await db.brand.update({ where: { id }, data })

    // ─── Section 6: Real-time broadcast ──────────────────────────────
    // Always emit an updated event
    await broadcastBrandEvent("updated", {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
    }, { source: adminUser.name })

    void logActivity({
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      action: "SETTINGS_UPDATE",
      entityType: "BRAND",
      entityId: updated.id,
      description: `Updated brand: ${updated.name}`,
      req,
    }).catch(() => {})

    return NextResponse.json({ brand: updated })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Admin brand PUT error:", error)
    return NextResponse.json({ error: "Failed to update brand" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireRole("ADMIN")
    const { id } = await params
    const existing = await db.brand.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 })
    }

    await db.brand.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), isActive: false },
    })

    // ─── Section 6: Real-time broadcast ──────────────────────────────
    await broadcastBrandEvent("updated", {
      id: existing.id,
      name: existing.name,
      slug: existing.slug,
    }, { source: adminUser.name })

    void logActivity({
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      action: "SETTINGS_UPDATE",
      entityType: "BRAND",
      entityId: existing.id,
      description: `Deleted brand: ${existing.name}`,
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
    console.error("Admin brand DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete brand" }, { status: 500 })
  }
}
