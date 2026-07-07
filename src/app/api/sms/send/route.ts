/**
 * POST /api/sms/send
 *
 * Send an SMS to a recipient (admin only).
 *
 * Body: { to, message, templateKey?, language?, priority? }
 */
import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"
import { sendSms } from "@/server/services/sms"
import { getSmsMessage, type SmsLanguage, type SmsTemplateKey } from "@/server/services/sms-templates"
import { z } from "zod"

const SendSmsSchema = z.object({
  to: z.string().min(9),
  message: z.string().optional(),
  templateKey: z.string().optional(),
  language: z.enum(["en", "rw"]).default("en"),
  variables: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
})

export async function POST(req: Request) {
  try {
    await requireRole("ADMIN")

    const body = await req.json()
    const parsed = SendSmsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { to, message, templateKey, language, variables } = parsed.data

    // Build message from template if provided
    let finalMessage = message
    if (templateKey && !message) {
      finalMessage = getSmsMessage(
        templateKey as SmsTemplateKey,
        language as SmsLanguage,
        variables || {}
      )
    }

    if (!finalMessage) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const result = await sendSms(to, finalMessage, templateKey as SmsTemplateKey)

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("SMS send error:", error)
    return NextResponse.json({ error: "Failed to send SMS" }, { status: 500 })
  }
}
