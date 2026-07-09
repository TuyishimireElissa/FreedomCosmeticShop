/**
 * POST /api/mobile/admin/quick-action
 *
 * Mobile-optimized quick action endpoint — allows admin to perform
 * common actions from their phone with a single API call.
 *
 * Body:
 *   - action: "confirm_order" | "ship_order" | "call_customer" | "send_sms"
 *   - orderId?: string (for confirm_order, ship_order)
 *   - riderName?: string (for ship_order)
 *   - riderPhone?: string (for ship_order)
 *   - phone?: string (for send_sms)
 *   - message?: string (for send_sms)
 *
 * Returns { success: true, message: string }
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  requirePermission,
  PERMISSIONS,
  rateLimit,
} from "@/lib/permissions"
import {
  broadcastOrderEvent,
  broadcastDeliveryEvent,
} from "@/lib/realtime"
import { getSmsMessage } from "@/server/services/sms-templates"
import { enqueueSms } from "@/server/services/sms-queue"
import { logActivity } from "@/server/services/activity"
import { features } from "@/lib/env"
import { z } from "zod"

const QuickActionSchema = z.object({
  action: z.enum(["confirm_order", "ship_order", "send_sms"]),
  orderId: z.string().optional(),
  riderName: z.string().optional(),
  riderPhone: z.string().optional(),
  phone: z.string().optional(),
  message: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = QuickActionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid action", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { action } = parsed.data

    // ─── Confirm order ─────────────────────────────────────────────
    if (action === "confirm_order") {
      const adminUser = await requirePermission(PERMISSIONS.ORDERS_UPDATE)
      const rl = rateLimit(`admin:${adminUser.id}:order-update`, {
        maxActions: 100,
        windowMs: 60000,
      })
      if (!rl.allowed) {
        return NextResponse.json({ error: "Rate limited" }, { status: 429 })
      }

      if (!parsed.data.orderId) {
        return NextResponse.json({ error: "orderId required" }, { status: 400 })
      }

      const order = await db.order.findFirst({
        where: { OR: [{ id: parsed.data.orderId }, { orderNumber: parsed.data.orderId }] },
      })
      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 })
      }

      await db.order.update({
        where: { id: order.id },
        data: { status: "CONFIRMED" },
      })

      await broadcastOrderEvent(
        "confirmed",
        {
          id: order.id,
          orderNumber: order.orderNumber,
          userId: order.userId,
          customerPhone: order.customerPhone,
          status: "CONFIRMED",
          total: order.total,
        },
        { source: adminUser.name }
      )

      if (features.sms) {
        const msg = getSmsMessage("ORDER_PLACED", "en", {
          orderNumber: order.orderNumber,
        })
        enqueueSms(order.customerPhone, msg, {
          priority: 1,
          template: "ORDER_PLACED",
        })
      }

      void logActivity({
        userId: adminUser.id,
        userName: adminUser.name,
        userRole: adminUser.role,
        action: "ORDER_UPDATE",
        entityType: "ORDER",
        entityId: order.id,
        description: `Confirmed order ${order.orderNumber} (mobile)`,
        req,
      }).catch(() => {})

      return NextResponse.json({
        success: true,
        message: `Order ${order.orderNumber} confirmed`,
      })
    }

    // ─── Ship order ────────────────────────────────────────────────
    if (action === "ship_order") {
      const adminUser = await requirePermission(PERMISSIONS.ORDERS_UPDATE)
      if (!parsed.data.orderId) {
        return NextResponse.json({ error: "orderId required" }, { status: 400 })
      }

      const order = await db.order.findFirst({
        where: { OR: [{ id: parsed.data.orderId }, { orderNumber: parsed.data.orderId }] },
        include: { delivery: true },
      })
      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 })
      }

      await db.order.update({
        where: { id: order.id },
        data: { status: "SHIPPED" },
      })

      if (order.delivery) {
        await db.delivery.update({
          where: { orderId: order.id },
          data: {
            status: "IN_TRANSIT",
            driverName: parsed.data.riderName || null,
            driverPhone: parsed.data.riderPhone || null,
            pickedUpAt: new Date(),
          },
        })
      }

      await broadcastOrderEvent(
        "shipped",
        {
          id: order.id,
          orderNumber: order.orderNumber,
          userId: order.userId,
          customerPhone: order.customerPhone,
          status: "SHIPPED",
          total: order.total,
        },
        { source: adminUser.name }
      )

      await broadcastDeliveryEvent(
        "assigned",
        {
          orderId: order.id,
          orderNumber: order.orderNumber,
          userId: order.userId,
          riderName: parsed.data.riderName,
          riderPhone: parsed.data.riderPhone,
        },
        { source: adminUser.name }
      )

      if (features.sms && parsed.data.riderName) {
        const msg = getSmsMessage("ORDER_SHIPPED", "en", {
          orderNumber: order.orderNumber,
          riderName: parsed.data.riderName,
          riderPhone: parsed.data.riderPhone || "N/A",
          etaDays: "1-2",
        })
        enqueueSms(order.customerPhone, msg, {
          priority: 1,
          template: "ORDER_SHIPPED",
        })
      }

      void logActivity({
        userId: adminUser.id,
        userName: adminUser.name,
        userRole: adminUser.role,
        action: "ORDER_UPDATE",
        entityType: "ORDER",
        entityId: order.id,
        description: `Shipped order ${order.orderNumber} (mobile, rider: ${parsed.data.riderName || "N/A"})`,
        req,
      }).catch(() => {})

      return NextResponse.json({
        success: true,
        message: `Order ${order.orderNumber} shipped`,
      })
    }

    // ─── Send SMS ──────────────────────────────────────────────────
    if (action === "send_sms") {
      const adminUser = await requirePermission(PERMISSIONS.SMS_SEND)
      if (!parsed.data.phone || !parsed.data.message) {
        return NextResponse.json(
          { error: "phone and message required" },
          { status: 400 }
        )
      }

      const rl = rateLimit(`admin:${adminUser.id}:sms-send`, {
        maxActions: 20,
        windowMs: 60000,
      })
      if (!rl.allowed) {
        return NextResponse.json(
          { error: "Rate limited. Max 20 SMS/min." },
          { status: 429 }
        )
      }

      enqueueSms(parsed.data.phone, parsed.data.message, {
        priority: 1,
        template: "PROMOTIONAL",
      })

      void logActivity({
        userId: adminUser.id,
        userName: adminUser.name,
        userRole: adminUser.role,
        action: "SMS_SEND",
        entityType: "CUSTOMER",
        entityId: parsed.data.phone,
        description: `Sent SMS to ${parsed.data.phone} (mobile)`,
        req,
      }).catch(() => {})

      return NextResponse.json({
        success: true,
        message: `SMS sent to ${parsed.data.phone}`,
      })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { statusCode: number }).statusCode }
      )
    }
    console.error("Mobile quick action error:", error)
    return NextResponse.json({ error: "Failed to perform action" }, { status: 500 })
  }
}
