/**
 * /api/admin/banners/[id]
 *
 * PUT    — Update a banner
 * DELETE — Delete a banner
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/auth"
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
    await requireRole("ADMIN")
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
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("ADMIN")
    const { id } = await params

    const existing = await db.banner.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Banner not found" }, { status: 404 })
    }

    await db.banner.delete({ where: { id } })
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
