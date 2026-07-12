export const dynamic = 'force-dynamic'

/**
 * User Addresses API — CRUD for delivery addresses.
 *
 * GET   /api/user/addresses — list user's addresses
 * POST  /api/user/addresses — add new address
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import { z } from "zod"

const CreateAddressSchema = z.object({
  label: z.string().min(1).max(50),
  recipientName: z.string().min(2).max(100),
  recipientPhone: z.string().min(9).max(20),
  province: z.string().min(2),
  district: z.string().min(2),
  sector: z.string().min(2),
  cell: z.string().optional().nullable(),
  village: z.string().optional().nullable(),
  streetAddress: z.string().optional().nullable(),
  isDefault: z.boolean().default(false),
})

export async function GET() {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const addresses = await db.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    })

    return NextResponse.json({ addresses })
  } catch (error) {
    console.error("Addresses GET error:", error)
    return NextResponse.json({ error: "Failed to fetch addresses" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const parsed = CreateAddressSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // If setting as default, unset previous default
    if (parsed.data.isDefault) {
      await db.address.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      })
    }

    const address = await db.address.create({
      data: {
        userId: user.id,
        label: parsed.data.label!,
        recipientName: parsed.data.recipientName!,
        recipientPhone: parsed.data.recipientPhone!,
        province: parsed.data.province!,
        district: parsed.data.district!,
        sector: parsed.data.sector!,
        cell: parsed.data.cell,
        village: parsed.data.village,
        streetAddress: parsed.data.streetAddress,
        isDefault: parsed.data.isDefault ?? false,
      },
    })

    return NextResponse.json({ address }, { status: 201 })
  } catch (error) {
    console.error("Address POST error:", error)
    return NextResponse.json({ error: "Failed to create address" }, { status: 500 })
  }
}
