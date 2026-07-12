export const dynamic = 'force-dynamic'

/**
 * /api/sms/opt-out
 *
 * POST — Opt out of promotional SMS
 *   Body: { phone }
 *
 * DELETE — Opt back in
 *   Body: { phone }
 *
 * GET — Check opt-out status
 *   Query: ?phone=+250788123456
 */
import { NextResponse } from "next/server"
import { optOut, optIn, hasOptedOut } from "@/server/services/sms"
import { z } from "zod"

const PhoneSchema = z.object({ phone: z.string().min(9) })

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = PhoneSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Phone is required" }, { status: 400 })
    }

    optOut(parsed.data.phone)
    return NextResponse.json({
      success: true,
      message: "You have been opted out of promotional SMS. Transactional messages will still be sent.",
    })
  } catch (error) {
    console.error("Opt-out error:", error)
    return NextResponse.json({ error: "Failed to opt out" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json()
    const parsed = PhoneSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Phone is required" }, { status: 400 })
    }

    optIn(parsed.data.phone)
    return NextResponse.json({
      success: true,
      message: "You have been opted back in to promotional SMS.",
    })
  } catch (error) {
    console.error("Opt-in error:", error)
    return NextResponse.json({ error: "Failed to opt in" }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const phone = searchParams.get("phone")
    if (!phone) {
      return NextResponse.json({ error: "Phone parameter is required" }, { status: 400 })
    }

    return NextResponse.json({
      phone,
      optedOut: hasOptedOut(phone),
    })
  } catch (error) {
    console.error("Opt-out check error:", error)
    return NextResponse.json({ error: "Failed to check opt-out" }, { status: 500 })
  }
}
