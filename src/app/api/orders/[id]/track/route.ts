import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { normalizeRwandaPhone } from '@/lib/phone'
import { orderAccessTokenFromRequest, verifyOrderAccessToken } from '@/lib/order-access'
import { rateLimit } from '@/lib/permissions'

const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0' }
const notFound = () => NextResponse.json({ error: 'Order not found or tracking details are invalid' }, { status: 404, headers: PRIVATE_HEADERS })

/**
 * Customer order tracking. Proof is mandatory: a signed order-access token,
 * the authenticated owner account, or the order phone number.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const limit = rateLimit(`order-track:${ip}`, { maxActions: 30, windowMs: 15 * 60_000 })
    if (!limit.allowed) return NextResponse.json({ error: 'Too many tracking attempts' }, { status: 429, headers: PRIVATE_HEADERS })

    const { id } = await params
    const order = await db.order.findFirst({
      where: { OR: [{ id }, { orderNumber: id }] },
      include: { items: true, payments: true, delivery: true },
    })
    if (!order) return notFound()

    const accessToken = orderAccessTokenFromRequest(request)
    const tokenValid = await verifyOrderAccessToken(accessToken, order.id)
    const auth = await requireAuth().catch(() => null)
    const accountOwnsOrder = Boolean(auth && order.userId && auth.id === order.userId)
    let phoneMatches = false
    const suppliedPhone = request.headers.get('x-order-phone')
    if (suppliedPhone) {
      try {
        phoneMatches = normalizeRwandaPhone(suppliedPhone) === normalizeRwandaPhone(order.customerPhone)
      } catch {
        phoneMatches = false
      }
    }
    if (!tokenValid && !accountOwnsOrder && !phoneMatches) return notFound()

    const timeline = [
      { status: 'PENDING', label: 'Order placed', timestamp: order.createdAt, completed: true },
      { status: 'CONFIRMED', label: 'Order confirmed', timestamp: order.status !== 'PENDING' ? order.updatedAt : null, completed: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status) },
      { status: 'PROCESSING', label: 'Being prepared', timestamp: null, completed: ['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status) },
      { status: 'SHIPPED', label: 'Out for delivery', timestamp: order.delivery?.pickedUpAt || null, completed: ['SHIPPED', 'DELIVERED'].includes(order.status) },
      { status: 'DELIVERED', label: 'Delivered', timestamp: order.delivery?.deliveredAt || null, completed: order.status === 'DELIVERED' },
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
        items: order.items.map((item) => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity, image: item.image })),
        paymentMethod: firstPayment?.method || 'COD',
        paymentStatus: firstPayment?.status || 'PENDING',
        deliveryStatus: order.delivery?.status || 'PENDING',
        trackingCode: order.delivery?.trackingCode || null,
        estimatedArrival: order.delivery?.estimatedArrival || null,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
      timeline,
    }, { headers: PRIVATE_HEADERS })
  } catch (error) {
    console.error('Order tracking error:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'Failed to track order' }, { status: 500, headers: PRIVATE_HEADERS })
  }
}
