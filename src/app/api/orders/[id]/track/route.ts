/**
 * GET /api/orders/[id]/track
 *
 * Public endpoint — track an order by order number (e.g., UB-2026-00001).
 * Returns order status, items, delivery info, and timeline.
 * No auth required (order number acts as a secret key).
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const order = await db.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
      include: {
        items: true,
        payments: true,
        delivery: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Build timeline from order + delivery status
    const timeline = [
      {
        status: "PENDING",
        label: "Order placed",
        timestamp: order.createdAt,
        completed: true,
      },
      {
        status: "CONFIRMED",
        label: "Order confirmed",
        timestamp: order.status !== "PENDING" ? order.updatedAt : null,
        completed: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status),
      },
      {
        status: "PROCESSING",
        label: "Being prepared",
        timestamp: null,
        completed: ["PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status),
      },
      {
        status: "SHIPPED",
        label: "Out for delivery",
        timestamp: order.delivery?.pickedUpAt || null,
        completed: ["SHIPPED", "DELIVERED"].includes(order.status),
      },
      {
        status: "DELIVERED",
        label: "Delivered",
        timestamp: order.delivery?.deliveredAt || null,
        completed: order.status === "DELIVERED",
      },
    ]

    const firstPayment = order.payments[0]

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        address: order.address,
        city: order.city,
        district: order.district,
        sector: order.sector,
        province: order.province,
        total: order.total,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        discountAmount: order.discountAmount,
        items: order.items,
        paymentMethod: firstPayment?.method || "COD",
        paymentStatus: firstPayment?.status || "PENDING",
        deliveryStatus: order.delivery?.status || "PENDING",
        trackingCode: order.delivery?.trackingCode,
        estimatedArrival: order.delivery?.estimatedArrival,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
      timeline,
    })
  } catch (error) {
    console.error("Order tracking error:", error)
    return NextResponse.json(
      { error: "Failed to track order" },
      { status: 500 }
    )
  }
}
