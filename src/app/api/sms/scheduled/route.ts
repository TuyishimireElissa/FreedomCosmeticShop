export const dynamic = 'force-dynamic'

/**
 * /api/sms/scheduled
 *
 * GET  — List all scheduled SMS
 * POST — Schedule a new SMS (single or broadcast)
 */
import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"
import { getScheduledSms, scheduleSms, scheduleBroadcast } from "@/server/services/sms-scheduler"
import { z } from "zod"

const ScheduleSmsSchema = z.object({
  name: z.string().min(2),
  message: z.string().min(5),
  recipients: z.array(z.string()).optional(),
  broadcast: z.boolean().default(false),
  scheduledAt: z.string().transform((s) => new Date(s)),
  language: z.enum(["en", "rw"]).default("en"),
})

export async function GET() {
  try {
    await requireRole("ADMIN")
    const scheduled = getScheduledSms()
    return NextResponse.json({ scheduled })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Scheduled SMS list error:", error)
    return NextResponse.json({ error: "Failed to fetch scheduled SMS" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    await requireRole("ADMIN")
    const body = await req.json()
    const parsed = ScheduleSmsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { name, message, recipients, broadcast, scheduledAt, language } = parsed.data

    let id: string
    if (broadcast) {
      // Broadcast to all customers
      id = await scheduleBroadcast(name, message, scheduledAt, language)
    } else {
      if (!recipients || recipients.length === 0) {
        return NextResponse.json({ error: "Recipients required (or set broadcast=true)" }, { status: 400 })
      }
      id = scheduleSms(name, message, recipients, scheduledAt, { language })
    }

    return NextResponse.json({ id, success: true }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Schedule SMS error:", error)
    return NextResponse.json({ error: "Failed to schedule SMS" }, { status: 500 })
  }
}
