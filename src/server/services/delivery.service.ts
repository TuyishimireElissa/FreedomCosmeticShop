/**
 * Delivery Service — Rwanda district-based delivery calculation.
 *
 * Zones:
 *   KIGALI_SAME_DAY: Gasabo, Kicukiro, Nyarugenge → 1,000 RWF (same day before 2PM)
 *   NORTHERN: Burera, Gakenke, Gicumbi, Musanze, Rulindo → 3,000 RWF (2-3 days)
 *   SOUTHERN: Gisagara, Huye, Kamonyi, Muhanga, Nyamagabe, Nyanza, Nyaruguru, Ruhango → 3,000 RWF (2-3 days)
 *   EASTERN: Bugesera, Gatsibo, Kayonza, Kirehe, Ngoma, Nyagatare, Rwamagana → 3,500 RWF (2-3 days)
 *   WESTERN: Karongi, Ngororero, Nyabihu, Nyamasheke, Rubavu, Rusizi, Rutsiro → 4,000 RWF (3-4 days)
 *
 * Free delivery: Orders above 50,000 RWF → free delivery (all zones)
 *
 * This service uses the existing DELIVERY_FEES from format.ts as defaults,
 * and can optionally read from DeliveryZoneSettings table for admin-managed fees.
 */

import { formatRWF } from "@/lib/format"
import { DISTRICT_TO_PROVINCE_MAP, RWANDA_DISTRICTS, RWANDA_SECTORS } from "@/lib/rwanda-locations"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DeliveryZone {
  name: string
  code: string
  districts: string[]
  fee: number
  deliveryTime: string
  isSameDay: boolean
  estimatedDays: number
  freeThreshold: number
}

export interface DeliveryCalculation {
  district: string
  province: string
  zone: string
  zoneName: string
  fee: number
  feeFormatted: string
  deliveryTime: string
  isFreeDelivery: boolean
  freeDeliveryThreshold: number
  amountNeededForFree: number
  message: string
  isSameDay: boolean
}

// ─── Zone definitions ────────────────────────────────────────────────────────

const ZONES: Record<string, DeliveryZone> = {
  KIGALI_SAME_DAY: {
    name: "Kigali Same Day",
    code: "KIGALI_SAME_DAY",
    districts: ["Gasabo", "Kicukiro", "Nyarugenge"],
    fee: 1000,
    deliveryTime: "Today by 6PM",
    isSameDay: true,
    estimatedDays: 0,
    freeThreshold: 50000,
  },
  NORTHERN: {
    name: "Northern Province",
    code: "NORTHERN",
    districts: ["Burera", "Gakenke", "Gicumbi", "Musanze", "Rulindo"],
    fee: 3000,
    deliveryTime: "2-3 business days",
    isSameDay: false,
    estimatedDays: 3,
    freeThreshold: 50000,
  },
  SOUTHERN: {
    name: "Southern Province",
    code: "SOUTHERN",
    districts: ["Gisagara", "Huye", "Kamonyi", "Muhanga", "Nyamagabe", "Nyanza", "Nyaruguru", "Ruhango"],
    fee: 3000,
    deliveryTime: "2-3 business days",
    isSameDay: false,
    estimatedDays: 3,
    freeThreshold: 50000,
  },
  EASTERN: {
    name: "Eastern Province",
    code: "EASTERN",
    districts: ["Bugesera", "Gatsibo", "Kayonza", "Kirehe", "Ngoma", "Nyagatare", "Rwamagana"],
    fee: 3500,
    deliveryTime: "2-3 business days",
    isSameDay: false,
    estimatedDays: 3,
    freeThreshold: 50000,
  },
  WESTERN: {
    name: "Western Province",
    code: "WESTERN",
    districts: ["Karongi", "Ngororero", "Nyabihu", "Nyamasheke", "Rubavu", "Rusizi", "Rutsiro"],
    fee: 4000,
    deliveryTime: "3-4 business days",
    isSameDay: false,
    estimatedDays: 4,
    freeThreshold: 50000,
  },
}

// ─── District → Zone mapping ─────────────────────────────────────────────────

const DISTRICT_TO_ZONE: Record<string, string> = {}
for (const [zoneCode, zone] of Object.entries(ZONES)) {
  for (const district of zone.districts) {
    DISTRICT_TO_ZONE[district] = zoneCode
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Get the delivery zone for a district.
 */
export function getDeliveryZone(district: string): DeliveryZone | null {
  const zoneCode = DISTRICT_TO_ZONE[district]
  if (!zoneCode) return null
  return ZONES[zoneCode] || null
}

/**
 * Get delivery fee for a district.
 * Returns 0 if district is unknown (shouldn't happen).
 */
export function getDeliveryFee(district: string): number {
  const zone = getDeliveryZone(district)
  return zone?.fee ?? 3000
}

/**
 * Get delivery time message for a district.
 */
export function getDeliveryTime(district: string): string {
  const zone = getDeliveryZone(district)
  return zone?.deliveryTime ?? "3-5 business days"
}

/**
 * Get a user-friendly delivery message for a district.
 */
export function getDeliveryMessage(district: string): string {
  const zone = getDeliveryZone(district)
  if (!zone) return "Standard delivery"
  if (zone.isSameDay) return `Same-day delivery (order before 2PM) — ${zone.deliveryTime}`
  return `Standard delivery — ${zone.deliveryTime}`
}

/**
 * Check if an order qualifies for free delivery.
 * Free delivery for orders above 50,000 RWF (all zones).
 */
export function isFreeDelivery(orderTotal: number, threshold: number = 50000): boolean {
  return orderTotal >= threshold
}

/**
 * Get all 30 districts as a flat array.
 */
export function getAllDistricts(): string[] {
  return Object.values(RWANDA_DISTRICTS).flat()
}

/**
 * Get sectors for a specific district.
 */
export function getSectorsByDistrict(district: string): string[] {
  return RWANDA_SECTORS[district] || []
}

/**
 * Get the province for a specific district.
 */
export function getProvinceByDistrict(district: string): string {
  return DISTRICT_TO_PROVINCE_MAP[district] || "Kigali City"
}

/**
 * Get all delivery zones.
 */
export function getAllZones(): DeliveryZone[] {
  return Object.values(ZONES)
}

/**
 * Full delivery calculation for a district + order total.
 * Returns formatted fee, free delivery info, and message.
 */
export function calculateDelivery(district: string, orderTotal: number): DeliveryCalculation {
  const zone = getDeliveryZone(district)
  const province = getProvinceByDistrict(district)

  if (!zone) {
    // Unknown district — use default
    return {
      district,
      province,
      zone: "UNKNOWN",
      zoneName: "Standard",
      fee: 3000,
      feeFormatted: formatRWF(3000),
      deliveryTime: "3-5 business days",
      isFreeDelivery: isFreeDelivery(orderTotal),
      freeDeliveryThreshold: 50000,
      amountNeededForFree: Math.max(0, 50000 - orderTotal),
      message: orderTotal >= 50000
        ? "🎉 FREE delivery!"
        : `Order ${formatRWF(50000 - orderTotal)} more for FREE delivery!`,
      isSameDay: false,
    }
  }

  const freeDelivery = isFreeDelivery(orderTotal, zone.freeThreshold)
  const amountNeeded = Math.max(0, zone.freeThreshold - orderTotal)

  let message: string
  if (freeDelivery) {
    message = "🎉 FREE delivery!"
  } else if (amountNeeded > 0) {
    message = `Order ${formatRWF(amountNeeded)} more for FREE delivery!`
  } else {
    message = `Delivery fee: ${formatRWF(zone.fee)}`
  }

  return {
    district,
    province,
    zone: zone.code,
    zoneName: zone.name,
    fee: freeDelivery ? 0 : zone.fee,
    feeFormatted: freeDelivery ? "FREE" : formatRWF(zone.fee),
    deliveryTime: zone.deliveryTime,
    isFreeDelivery: freeDelivery,
    freeDeliveryThreshold: zone.freeThreshold,
    amountNeededForFree: amountNeeded,
    message,
    isSameDay: zone.isSameDay,
  }
}
