import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateDelivery, getAllDistricts } from '@/server/services/delivery.service'

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams
    const district = params.get('district')?.trim() || ''
    const orderTotal = Number(params.get('orderTotal') || 0)
    if (!getAllDistricts().includes(district)) return NextResponse.json({ success: false, error: 'A valid Rwanda district is required' }, { status: 400 })
    if (!Number.isFinite(orderTotal) || orderTotal < 0) return NextResponse.json({ success: false, error: 'orderTotal must be a positive number' }, { status: 400 })

    const calculation = calculateDelivery(district, orderTotal)
    const override = await prisma.deliveryZoneSettings.findUnique({ where: { zoneCode: calculation.zone } })
    let result = calculation
    if (override?.isActive) {
      const free = orderTotal >= override.freeThreshold
      result = { ...calculation, fee: free ? 0 : override.baseFee, feeFormatted: free ? 'FREE' : `${override.baseFee.toLocaleString()} RWF`, isFreeDelivery: free, freeDeliveryThreshold: override.freeThreshold, amountNeededForFree: Math.max(0, override.freeThreshold - orderTotal), deliveryTime: `${override.estimatedDays} business days`, isSameDay: override.isSameDay, message: free ? '🎉 FREE delivery!' : `Delivery fee: ${override.baseFee.toLocaleString()} RWF` }
    }
    return NextResponse.json({ success: true, data: result, ...result })
  } catch (error) {
    console.error('Delivery calculation API error:', error)
    return NextResponse.json({ success: false, error: 'Failed to calculate delivery' }, { status: 500 })
  }
}
