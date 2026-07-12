export const dynamic = 'force-dynamic'

/**
 * /api/admin/categories
 *
 * GET  — List all categories (admin)
 * POST — Create a new category
 *
 * Section 6: Broadcasts category:created event so storefront navigation
 * + homepage category grid update instantly.
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { broadcastCategoryEvent } from "@/lib/realtime"
import { logActivity } from "@/server/services/activity"
import { z } from "zod"

const CreateCategorySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional().nullable(),
  image: z.string().url().optional().nullable(),
  icon: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
})

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

export async function GET() {
  try {
    await requireRole("ADMIN", "STAFF", "MANAGER")
    const categories = await db.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    })
    return NextResponse.json({ categories })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Admin categories GET error:", error)
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const adminUser = await requireRole("ADMIN")
    const body = await req.json()
    const parsed = CreateCategorySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid category data", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    let slug = slugify(parsed.data.name)
    const existing = await db.category.findFirst({ where: { slug } })
    if (existing) slug = `${slug}-${Date.now().toString(36)}`

    const category = await db.category.create({
      data: {
        name: parsed.data.name!,
        slug,
        description: parsed.data.description || null,
        image: parsed.data.image || null,
        icon: parsed.data.icon || null,
        parentId: parsed.data.parentId || null,
        sortOrder: parsed.data.sortOrder ?? 0,
        isActive: parsed.data.isActive ?? true,
      },
    })

    // ─── Section 6: Real-time broadcast ──────────────────────────────
    await broadcastCategoryEvent("created", {
      id: category.id,
      name: category.name,
      slug: category.slug,
      isActive: category.isActive,
    }, { source: adminUser.name })

    void logActivity({
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      action: "SETTINGS_UPDATE",
      entityType: "CATEGORY",
      entityId: category.id,
      description: `Created category: ${category.name}`,
      req,
    }).catch(() => {})

    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Admin category POST error:", error)
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 })
  }
}
