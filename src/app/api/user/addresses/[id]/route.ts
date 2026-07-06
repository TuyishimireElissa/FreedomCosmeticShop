/**
 * User Address [id] API — update + delete.
 *
 * PUT    /api/user/addresses/:id — update address
 * DELETE /api/user/addresses/:id — delete address
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import { z } from "zod"

const UpdateAddressSchema = z.object({
  label: z.string().min(1).max(50).optional(),
  recipientName: z.string().min(2).max(100).optional(),
  recipientPhone: z.string().min(9).max(20).optional(),
  province: z.string().min(2).optional(),
  district: z.string().min(2).optional(),
  sector: z.string().min(2).optional(),
  cell: z.string().optional().nullable(),
  village: z.string().optional().nullable(),
  streetAddress: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
})

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const parsed = UpdateAddressSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    const existing = await db.address.findFirst({
      where: { id, userId: user.id },
    })
    if (!existing) return NextResponse.json({ error: "Address not found" }, { status: 404 })

    // If setting as default, unset previous
    if (parsed.data.isDefault) {
      await db.address.updateMany({
        where: { userId: user.id, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      })
    }

    const updated = await db.address.update({ where: { id }, data: parsed.data })
    return NextResponse.json({ address: updated })
  } catch (error) {
    console.error("Address PUT error:", error)
    return NextResponse.json({ error: "Failed to update address" }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const existing = await db.address.findFirst({
      where: { id, userId: user.id },
    })
    if (!existing) return NextResponse.json({ error: "Address not found" }, { status: 404 })

    await db.address.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Address DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete address" }, { status: 500 })
  }
}
