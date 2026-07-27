export const dynamic = 'force-dynamic'

/** GET /api/wholesale/my-credit — get credit limit and balance */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import { WHOLESALE_CONFIG } from "@/lib/wholesale-config"

export async function GET() {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    if (!WHOLESALE_CONFIG.credit.enabled) {
      return NextResponse.json({ hasCredit: false, creditEnabled: false, message: "Wholesale credit is not enabled." })
    }

    const credit = await db.wholesaleCredit.findUnique({
      where: { userId: user.id },
      include: {
        history: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    })

    if (!credit) {
      return NextResponse.json({ hasCredit: false, message: "No credit account. Contact admin to set up credit terms." })
    }

    return NextResponse.json({
      hasCredit: true,
      creditLimit: credit.creditLimit,
      usedCredit: credit.usedCredit,
      availableCredit: credit.availableCredit,
      paymentTermDays: credit.paymentTermDays,
      history: credit.history.map((h) => ({
        id: h.id,
        type: h.type,
        amount: h.amount,
        description: h.description,
        orderId: h.orderId,
        date: h.createdAt,
      })),
    })
  } catch (error) {
    console.error("Credit fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch credit" }, { status: 500 })
  }
}
