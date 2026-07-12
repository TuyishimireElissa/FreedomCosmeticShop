export const dynamic = 'force-dynamic'

/**
 * GET /api/sms/templates
 *
 * Returns all SMS templates (EN + RW) with variable info.
 * Admin only.
 */
import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"
import { SMS_TEMPLATES } from "@/server/services/sms-templates"

export async function GET() {
  try {
    await requireRole("ADMIN")

    const templates = Object.values(SMS_TEMPLATES).map((t) => ({
      key: t.key,
      label: t.label,
      description: t.description,
      en: t.en,
      rw: t.rw,
      variables: t.variables,
      critical: t.critical,
    }))

    return NextResponse.json({ templates })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Templates list error:", error)
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 })
  }
}
