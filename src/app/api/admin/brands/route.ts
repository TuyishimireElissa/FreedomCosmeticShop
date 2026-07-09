/**
 * /api/admin/brands
 *
 * GET  — List all brands (admin, includes inactive)
 * POST — Create a new brand
 *
 * Section 6: Broadcasts brand:created event so storefront brand carousel
 * updates instantly.
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { broadcastBrandEvent } from "@/lib/realtime"
import { logActivity } from "@/server/services/activity"
import { z } from "zod"

const CreateBrandSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional().nullable(),
  logo: z.string().url().optional().nullable(),
  country: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
})

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

export async function GET() {
  try {
    await requireRole("ADMIN", "STAFF", "MANAGER")
    const brands = await db.brand.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    })
    return NextResponse.json({ brands })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Admin brands GET error:", error)
    return NextResponse.json({ error: "Failed to fetch brands" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const adminUser = await requireRole("ADMIN")
    const body = await req.json()
    const parsed = CreateBrandSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid brand data", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    let slug = slugify(parsed.data.name)
    const existing = await db.brand.findFirst({ where: { slug } })
    if (existing) slug = `${slug}-${Date.now().toString(36)}`

    const brand = await db.brand.create({
      data: {
        ...parsed.data,
        slug,
        description: parsed.data.description || null,
        logo: parsed.data.logo || null,
        country: parsed.data.country || null,
      },
    })

    // ─── Section 6: Real-time broadcast ──────────────────────────────
    await broadcastBrandEvent("created", {
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
    }, { source: adminUser.name })

    void logActivity({
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      action: "SETTINGS_UPDATE",
      entityType: "BRAND",
      entityId: brand.id,
      description: `Created brand: ${brand.name}`,
      req,
    }).catch(() => {})

    return NextResponse.json({ brand }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Admin brand POST error:", error)
    return NextResponse.json({ error: "Failed to create brand" }, { status: 500 })
  }
}
