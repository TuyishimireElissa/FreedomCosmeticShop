export const dynamic = 'force-dynamic'

/**
 * /api/admin/blog/[id]
 *
 * PUT    — Update a blog post (title, content, status, etc.)
 * DELETE — Soft-delete a blog post
 *
 * Section 6: Broadcasts blog:published / blog:unpublished / blog:updated
 * events so the storefront BeautyTips section updates instantly.
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { broadcastBlogEvent } from "@/lib/realtime"
import { logActivity } from "@/server/services/activity"
import { z } from "zod"

const UpdatePostSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  excerpt: z.string().max(500).optional().nullable(),
  content: z.string().min(10).optional(),
  coverImage: z.string().url().optional().nullable(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
})

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireRole("ADMIN", "STAFF", "MANAGER")
    const { id } = await params
    const body = await req.json()
    const parsed = UpdatePostSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid update", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const existing = await db.blogPost.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (parsed.data.title) {
      data.title = parsed.data.title
      let slug = parsed.data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
      const slugExists = await db.blogPost.findFirst({ where: { slug, id: { not: id } } })
      if (slugExists) slug = `${slug}-${Date.now().toString(36)}`
      data.slug = slug
    }
    if (parsed.data.excerpt !== undefined) data.excerpt = parsed.data.excerpt || null
    if (parsed.data.content) data.content = parsed.data.content
    if (parsed.data.coverImage !== undefined) data.coverImage = parsed.data.coverImage || null
    if (parsed.data.tags) data.tags = JSON.stringify(parsed.data.tags)
    if (parsed.data.status) {
      data.status = parsed.data.status
      // Set publishedAt when transitioning to PUBLISHED
      if (parsed.data.status === "PUBLISHED" && existing.status !== "PUBLISHED") {
        data.publishedAt = new Date()
      }
    }

    const updated = await db.blogPost.update({ where: { id }, data })

    // ─── Section 6: Real-time broadcast with smart event detection ───
    const wasPublished = existing.status !== "PUBLISHED" && updated.status === "PUBLISHED"
    const wasUnpublished = existing.status === "PUBLISHED" && updated.status !== "PUBLISHED"

    if (wasPublished) {
      await broadcastBlogEvent("published", {
        id: updated.id,
        title: updated.title,
        slug: updated.slug,
        status: updated.status,
      }, { source: adminUser.name })
    } else if (wasUnpublished) {
      await broadcastBlogEvent("unpublished", {
        id: updated.id,
        title: updated.title,
        slug: updated.slug,
        status: updated.status,
      }, { source: adminUser.name })
    } else {
      await broadcastBlogEvent("updated", {
        id: updated.id,
        title: updated.title,
        slug: updated.slug,
        status: updated.status,
      }, { source: adminUser.name })
    }

    void logActivity({
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      action: "SETTINGS_UPDATE",
      entityType: "BLOG",
      entityId: updated.id,
      description: `Updated blog post: ${updated.title} (${wasPublished ? "published" : wasUnpublished ? "unpublished" : "updated"})`,
      req,
    }).catch(() => {})

    return NextResponse.json({
      post: { ...updated, tags: updated.tags ? JSON.parse(updated.tags) : [] },
    })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Admin blog PUT error:", error)
    return NextResponse.json({ error: "Failed to update blog post" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireRole("ADMIN")
    const { id } = await params
    const existing = await db.blogPost.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    await db.blogPost.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), status: "ARCHIVED" },
    })

    // ─── Section 6: Real-time broadcast ──────────────────────────────
    await broadcastBlogEvent("unpublished", {
      id: existing.id,
      title: existing.title,
      slug: existing.slug,
      status: "ARCHIVED",
    }, { source: adminUser.name })

    void logActivity({
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      action: "SETTINGS_UPDATE",
      entityType: "BLOG",
      entityId: existing.id,
      description: `Deleted blog post: ${existing.title}`,
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
    console.error("Admin blog DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete blog post" }, { status: 500 })
  }
}
