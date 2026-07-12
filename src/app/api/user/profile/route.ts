export const dynamic = 'force-dynamic'

/**
 * User Profile API — get/update own profile.
 *
 * GET  /api/user/profile — get current user's profile
 * PUT  /api/user/profile — update name, email, avatar
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import { z } from "zod"

const UpdateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional().nullable(),
  avatar: z.string().url().optional().nullable(),
})

export async function GET() {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const fullUser = await db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        avatar: true,
        loyaltyPoints: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ user: fullUser })
  } catch (error) {
    console.error("Profile GET error:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const parsed = UpdateProfileSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data: parsed.data,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        avatar: true,
        loyaltyPoints: true,
      },
    })

    return NextResponse.json({ user: updated })
  } catch (error) {
    console.error("Profile PUT error:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
