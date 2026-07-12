export const dynamic = 'force-dynamic'

/**
 * GET  /api/settings/store — public, returns store settings (name, logo, etc.)
 * PUT  /api/settings/store — admin only, updates text fields
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { z } from "zod"

export async function GET() {
  try {
    let settings = await db.storeSettings.findFirst()
    if (!settings) {
      settings = await db.storeSettings.create({ data: {} })
    }
    return NextResponse.json({ settings })
  } catch (error) {
    console.error("Settings GET error:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

const UpdateSchema = z.object({
  storeName: z.string().min(2).max(100).optional(),
  storeShortName: z.string().max(50).optional(),
  storeTagline: z.string().max(200).nullable().optional(),
  storeEmail: z.string().email().nullable().optional(),
  storePhone: z.string().max(20).nullable().optional(),
  storeWhatsApp: z.string().max(20).nullable().optional(),
  storeAddress: z.string().max(200).nullable().optional(),
  primaryColor: z.string().max(7).optional(),
  secondaryColor: z.string().max(7).optional(),
  accentColor: z.string().max(7).optional(),
  metaTitle: z.string().max(200).nullable().optional(),
  metaDescription: z.string().max(500).nullable().optional(),
  socialInstagram: z.string().nullable().optional(),
  socialFacebook: z.string().nullable().optional(),
  socialTikTok: z.string().nullable().optional(),
  socialYoutube: z.string().nullable().optional(),
  socialTwitter: z.string().nullable().optional(),
})

export async function PUT(req: Request) {
  try {
    await requireRole("ADMIN")
    const body = await req.json()
    const parsed = UpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 })
    }

    let settings = await db.storeSettings.findFirst()
    if (!settings) {
      settings = await db.storeSettings.create({ data: {} })
    }

    const updated = await db.storeSettings.update({
      where: { id: settings.id },
      data: parsed.data,
    })

    return NextResponse.json({ settings: updated })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json({ error: error.message }, { status: (error as { statusCode: number }).statusCode })
    }
    console.error("Settings PUT error:", error)
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}
