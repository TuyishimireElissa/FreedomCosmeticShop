export const dynamic = 'force-dynamic'

/**
 * /api/admin/blog
 *
 * GET  — List all blog posts (admin, includes drafts)
 * POST — Create a new blog post
 *
 * Section 6: Broadcasts blog:published / blog:updated events on create/update
 * so the storefront BeautyTips section updates instantly.
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { broadcastBlogEvent } from "@/lib/realtime"
import { logActivity } from "@/server/services/activity"
import { z } from "zod"

const CreatePostSchema = z.object({
  title: z.string().min(2).max(200),
  excerpt: z.string().max(500).optional().nullable(),
  content: z.string().min(10),
  coverImage: z.string().url().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
})

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

export async function GET() {
  try {
    await requireRole("ADMIN", "STAFF", "MANAGER")
    const posts = await db.blogPost.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    })
    const serialized = posts.map((p) => ({
      ...p,
      tags: p.tags ? JSON.parse(p.tags) : [],
    }))
    return NextResponse.json({ posts: serialized })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Admin blog GET error:", error)
    return NextResponse.json({ error: "Failed to fetch blog posts" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const adminUser = await requireRole("ADMIN", "STAFF", "MANAGER")
    const body = await req.json()
    const parsed = CreatePostSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid post data", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Generate unique slug
    let slug = slugify(parsed.data.title)
    const existing = await db.blogPost.findFirst({ where: { slug } })
    if (existing) slug = `${slug}-${Date.now().toString(36)}`

    const post = await db.blogPost.create({
      data: {
        title: parsed.data.title,
        slug,
        excerpt: parsed.data.excerpt || null,
        content: parsed.data.content,
        coverImage: parsed.data.coverImage || null,
        tags: JSON.stringify(parsed.data.tags),
        status: parsed.data.status,
        publishedAt: parsed.data.status === "PUBLISHED" ? new Date() : null,
        authorId: adminUser.id,
      },
    })

    // ─── Section 6: Real-time broadcast ──────────────────────────────
    if (post.status === "PUBLISHED") {
      await broadcastBlogEvent("published", {
        id: post.id,
        title: post.title,
        slug: post.slug,
        status: post.status,
      }, { source: adminUser.name })
    }

    void logActivity({
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      action: "BLOG_CREATE" in {} ? "BLOG_CREATE" : "SETTINGS_UPDATE",
      entityType: "BLOG",
      entityId: post.id,
      description: `Created blog post: ${post.title} (${post.status})`,
      req,
    }).catch(() => {})

    return NextResponse.json({
      post: { ...post, tags: post.tags ? JSON.parse(post.tags) : [] },
    }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Admin blog POST error:", error)
    return NextResponse.json({ error: "Failed to create blog post" }, { status: 500 })
  }
}
