/**
 * /api/admin/banners
 *
 * GET  — List all banners
 * POST — Create a new banner
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { z } from "zod"

const CreateBannerSchema = z.object({
  title: z.string().min(2).max(200),
  subtitle: z.string().max(500).optional().nullable(),
  image: z.string().url(),
  mobileImage: z.string().url().optional().nullable(),
  linkType: z.string().optional().nullable(),
  linkUrl: z.string().optional().nullable(),
  placement: z.enum([
    "HOME_HERO",
    "HOME_PROMO",
    "SIDEBAR",
    "CATEGORY_TOP",
    "CHECKOUT_BANNER",
  ]).default("HOME_HERO"),
  startsAt: z.string().optional().nullable().transform((s) => (s ? new Date(s) : null)),
  endsAt: z.string().optional().nullable().transform((s) => (s ? new Date(s) : null)),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
})

export async function GET() {
  try {
    await requireRole("ADMIN")

    const banners = await db.banner.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    })

    return NextResponse.json({ banners })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Banners list error:", error)
    return NextResponse.json({ error: "Failed to fetch banners" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    await requireRole("ADMIN")
    const body = await req.json()

    const parsed = CreateBannerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid banner data", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const banner = await db.banner.create({ data: parsed.data })
    return NextResponse.json({ banner }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Banner create error:", error)
    return NextResponse.json({ error: "Failed to create banner" }, { status: 500 })
  }
}
