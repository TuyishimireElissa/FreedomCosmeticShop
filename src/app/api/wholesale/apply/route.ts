export const dynamic = 'force-dynamic'

/** POST /api/wholesale/apply — submit wholesale application (auth required) */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import { sendWholesaleSms } from "@/server/services/wholesale"
import { broadcastNotificationEvent } from "@/lib/realtime"
import { z } from "zod"

const ApplySchema = z.object({
  businessName: z.string().min(2).max(200),
  businessType: z.enum(["BEAUTY_SALON","HAIR_SALON","SPA","SHOP","MARKET_VENDOR","BEAUTY_SCHOOL","HOTEL","RESELLER","OTHER"]),
  businessPhone: z.string().min(9),
  businessAddress: z.string().min(5),
  businessDistrict: z.string().min(2),
  tinNumber: z.string().optional(),
  yearsInBusiness: z.number().int().min(0).optional(),
  monthlyRevenue: z.string().optional(),
  nationalId: z.string().optional(),
  heardFrom: z.string().optional(),
  documents: z.array(z.string()).optional().default([]),
  notes: z.string().max(1000).optional(),
})

export async function POST(req: Request) {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    const body = await req.json()
    const parsed = ApplySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 })
    }

    // Check if already applied
    const existing = await db.wholesaleApplication.findUnique({ where: { userId: user.id } })
    if (existing && existing.status === "PENDING") {
      return NextResponse.json({ error: "You already have a pending application" }, { status: 400 })
    }
    if (existing && existing.status === "APPROVED") {
      return NextResponse.json({ error: "Your wholesale account is already approved" }, { status: 400 })
    }

    // Create or update application
    const application = await db.wholesaleApplication.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        businessName: parsed.data.businessName!,
        businessType: parsed.data.businessType!,
        businessPhone: parsed.data.businessPhone!,
        businessAddress: parsed.data.businessAddress!,
        businessDistrict: parsed.data.businessDistrict!,
        tinNumber: parsed.data.tinNumber,
        yearsInBusiness: parsed.data.yearsInBusiness,
        monthlyRevenue: parsed.data.monthlyRevenue,
        nationalId: parsed.data.nationalId,
        heardFrom: parsed.data.heardFrom,
        documents: JSON.stringify(parsed.data.documents ?? []),
        notes: parsed.data.notes,
        status: "PENDING",
      },
      update: {
        ...parsed.data,
        documents: JSON.stringify(parsed.data.documents),
        status: "PENDING",
        reviewedAt: null,
        rejectionReason: null,
        appliedAt: new Date(),
      },
    })

    // Update user with business info
    await db.user.update({
      where: { id: user.id },
      data: {
        userType: "WHOLESALE",
        wholesaleStatus: "PENDING",
        businessName: parsed.data.businessName,
        businessType: parsed.data.businessType,
        businessPhone: parsed.data.businessPhone,
        businessAddress: parsed.data.businessAddress,
        businessDistrict: parsed.data.businessDistrict,
        tinNumber: parsed.data.tinNumber || null,
      },
    })

    // Send SMS confirmation
    await sendWholesaleSms(user.phone, "application_received", { id: application.id.slice(-8).toUpperCase() })

    // Notify admin
    const admins = await db.user.findMany({
      where: { role: "ADMIN", isDeleted: false },
      select: { id: true },
    })
    for (const admin of admins) {
      await db.notification.create({
        data: {
          userId: admin.id,
          type: "PROMOTION",
          title: "🏪 New wholesale application",
          body: `${parsed.data.businessName} (${parsed.data.businessType}) applied for wholesale`,
          data: JSON.stringify({ applicationId: application.id }),
          linkType: "URL",
          linkUrl: "/?view=admin",
        },
      })
      void broadcastNotificationEvent("new", {
        id: application.id,
        userId: admin.id,
        type: "wholesale_application",
        title: "🏪 New wholesale application",
      }, { source: user.name }).catch(() => {})
    }

    return NextResponse.json({ application, message: "Application submitted successfully" }, { status: 201 })
  } catch (error) {
    console.error("Wholesale apply error:", error)
    return NextResponse.json({ error: "Failed to submit application" }, { status: 500 })
  }
}
