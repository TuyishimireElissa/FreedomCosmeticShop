export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizeRwandaPhone } from '@/lib/phone'
import { POST as initiateMobileMoney } from '@/app/api/payments/momo/route'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { orderId, phone } = body as { orderId?: string; phone?: string }
    if (!orderId || !phone) return NextResponse.json({ success: false, error: 'orderId and phone are required' }, { status: 400 })
    let normalized: string
    try { normalized = normalizeRwandaPhone(phone) } catch { return NextResponse.json({ success: false, error: 'Invalid Rwanda phone number' }, { status: 400 }) }
    if (!/^\+2507[89]\d{7}$/.test(normalized)) return NextResponse.json({ success: false, error: 'MTN number must start with 078 or 079' }, { status: 400 })
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true } }); if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    const proxyRequest = new Request(request.url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderId, phone: normalized, network: 'MTN' }) })
    const response = await initiateMobileMoney(proxyRequest)
    const payload = await response.json()
    if (!response.ok) return NextResponse.json({ success: false, error: payload.error || 'Payment initiation failed' }, { status: response.status })
    return NextResponse.json({ success: true, data: payload, ...payload })
  } catch (error) { console.error('MTN MoMo API error:', error); return NextResponse.json({ success: false, error: 'Failed to initiate MTN MoMo payment' }, { status: 500 }) }
}
