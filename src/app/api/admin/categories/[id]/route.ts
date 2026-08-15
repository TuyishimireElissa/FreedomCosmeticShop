export const dynamic = 'force-dynamic'

/**
 * /api/admin/categories/[id]
 *
 * PUT    — Update a category (name, description, image, isActive, etc.)
 * DELETE — Soft-delete a category (deactivate)
 *
 * Section 6: Broadcasts category:updated / category:deactivated events.
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { DESTRUCTIVE_OPERATIONS, PERMISSIONS, requireDestructiveOperation, requirePermission } from "@/lib/permissions"
import { broadcastCategoryEvent } from "@/lib/realtime"
import { logActivity } from "@/server/services/activity"
import { z } from "zod"

const UpdateCategorySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  // Kinyarwanda display name, editable from the admin panel so the owner
  // never needs a developer to rename a category.
  nameRw: z.string().min(1).max(100).optional().nullable(),
  /**
   * Explicit slug change. Renaming a category no longer rewrites its slug on
   * its own — see the note on the update below. A caller that genuinely wants
   * a new URL has to ask for one here.
   */
  slug: z.string().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers and single hyphens').optional(),
  description: z.string().max(500).optional().nullable(),
  image: z.string().url().optional().nullable(),
  icon: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
})

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requirePermission(PERMISSIONS.PRODUCTS_UPDATE)
    const { id } = await params
    const body = await req.json()
    const parsed = UpdateCategorySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid update", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const existing = await db.category.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    const data: Record<string, unknown> = { ...parsed.data }

    /**
     * A rename must NOT silently change the slug.
     *
     * This route used to regenerate the slug from the name on every rename.
     * The slug is the public URL (/products?category=<slug>) and it is what
     * customers share on WhatsApp, so fixing a typo in a category name would
     * quietly break every link already sent out — and there are no redirects
     * to catch them. Product.categoryId is unaffected either way, so nothing
     * is gained by rewriting it.
     *
     * The slug now changes only when a caller passes one explicitly.
     */
    if (parsed.data.slug && parsed.data.slug !== existing.slug) {
      const slugExists = await db.category.findFirst({ where: { slug: parsed.data.slug, id: { not: id } } })
      if (slugExists) {
        return NextResponse.json({ error: "That slug is already used by another category" }, { status: 409 })
      }
      data.slug = parsed.data.slug
    } else {
      delete data.slug
    }

    const updated = await db.category.update({ where: { id }, data })

    // ─── Section 6: Real-time broadcast ──────────────────────────────
    const wasDeactivated = parsed.data.isActive === false && existing.isActive === true
    await broadcastCategoryEvent(
      wasDeactivated ? "deactivated" : "updated",
      {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        isActive: updated.isActive,
      },
      { source: adminUser.name }
    )

    void logActivity({
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      action: "SETTINGS_UPDATE",
      entityType: "CATEGORY",
      entityId: updated.id,
      description: `Updated category: ${updated.name}${wasDeactivated ? " (deactivated)" : ""}`,
      req,
    }).catch(() => {})

    return NextResponse.json({ category: updated })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Admin category PUT error:", error)
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireDestructiveOperation(DESTRUCTIVE_OPERATIONS.CONTENT_DELETE)
    const { id } = await params
    const existing = await db.category.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    // Deactivate instead of hard delete (products still reference it)
    const updated = await db.category.update({
      where: { id },
      data: { isActive: false },
    })

    // ─── Section 6: Real-time broadcast ──────────────────────────────
    await broadcastCategoryEvent("deactivated", {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      isActive: false,
    }, { source: adminUser.name })

    void logActivity({
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      action: "SETTINGS_UPDATE",
      entityType: "CATEGORY",
      entityId: updated.id,
      description: `Deactivated category: ${updated.name}`,
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
    console.error("Admin category DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 })
  }
}
