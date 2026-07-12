import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAllZones } from '@/server/services/delivery.service'

export async function GET() {
  try {
    const defaults = getAllZones()
    const overrides = await prisma.deliveryZoneSettings.findMany({ where: { isActive: true } })
    const zones = defaults.map((zone) => {
      const override = overrides.find((item) => item.zoneCode === zone.code)
      return { ...zone, fee: override?.baseFee ?? zone.fee, deliveryTime: override ? `${override.estimatedDays} business days` : zone.deliveryTime, freeThreshold: override?.freeThreshold ?? zone.freeThreshold, isSameDay: override?.isSameDay ?? zone.isSameDay }
    })
    return NextResponse.json({ success: true, data: { zones }, zones })
  } catch (error) {
    console.error('Delivery zones API error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch delivery zones' }, { status: 500 })
  }
}
