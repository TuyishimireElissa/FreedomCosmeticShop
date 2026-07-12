export const dynamic = 'force-dynamic'

/**
 * Notification Read API — mark a single notification as read.
 *
 * PUT /api/notifications/read/:id — mark single notification as read
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function PUT(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const notification = await db.notification.findFirst({
      where: { id, userId: user.id },
    })
    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }

    await db.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Notification read error:", error)
    return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 })
  }
}
