import rawRwandaHierarchy from '@/data/rwanda-administrative.json'

/**
 * Rwanda administrative hierarchy: Province → District → Sector → Cell → Village.
 *
 * Dataset: ngabovictor/Rwanda, data.json, commit 33ef6ca58b1bd631c476ea1d27644d1f450c1ea8.
 * The dataset credits Rwanda administrative location data and is vendored locally
 * so checkout never depends on a third-party network request.
 *
 * Counts in this pinned dataset: 5 provinces, 30 districts, 416 sectors,
 * 2,149 cells and 14,837 villages.
 */

export const RWANDA_PROVINCES = ['Kigali City', 'Northern Province', 'Southern Province', 'Eastern Province', 'Western Province'] as const
export type RwandaProvince = (typeof RWANDA_PROVINCES)[number]

type RwandaHierarchy = Record<string, Record<string, Record<string, Record<string, string[]>>>>
const HIERARCHY = rawRwandaHierarchy as RwandaHierarchy
const DATA_KEY_BY_PROVINCE: Record<RwandaProvince, string> = {
  'Kigali City': 'Kigali',
  'Northern Province': 'North',
  'Southern Province': 'South',
  'Eastern Province': 'East',
  'Western Province': 'West',
}

export interface RwandaDistrictLocation {
  name: string
  deliveryFee: number
  deliveryDays: number
  isSameDay: boolean
  sectors: string[]
}
export interface RwandaLocation {
  province: RwandaProvince
  districts: RwandaDistrictLocation[]
}

const DELIVERY_BY_PROVINCE: Record<RwandaProvince, { fee: number; days: number; sameDay: boolean }> = {
  'Kigali City': { fee: 1000, days: 0, sameDay: true },
  'Northern Province': { fee: 3000, days: 2, sameDay: false },
  'Southern Province': { fee: 3000, days: 2, sameDay: false },
  'Eastern Province': { fee: 3500, days: 2, sameDay: false },
  'Western Province': { fee: 4000, days: 3, sameDay: false },
}

function provinceTree(province: RwandaProvince) {
  return HIERARCHY[DATA_KEY_BY_PROVINCE[province]] || {}
}

export const RWANDA_LOCATION_DATA: RwandaLocation[] = RWANDA_PROVINCES.map((province) => {
  const tree = provinceTree(province)
  const delivery = DELIVERY_BY_PROVINCE[province]
  return {
    province,
    districts: Object.keys(tree).map((name) => ({
      name,
      deliveryFee: delivery.fee,
      deliveryDays: name === 'Nyagatare' ? 3 : delivery.days,
      isSameDay: delivery.sameDay,
      sectors: Object.keys(tree[name]),
    })),
  }
})

// Backward-compatible exports used by existing checkout and delivery APIs.
export const RWANDA_DISTRICTS = Object.fromEntries(
  RWANDA_LOCATION_DATA.map(({ province, districts }) => [province, districts.map(({ name }) => name)]),
) as Record<RwandaProvince, string[]>
export const RWANDA_SECTORS = Object.fromEntries(
  RWANDA_LOCATION_DATA.flatMap(({ districts }) => districts.map(({ name, sectors }) => [name, sectors])),
) as Record<string, string[]>
export const DISTRICT_TO_PROVINCE_MAP = Object.fromEntries(
  RWANDA_LOCATION_DATA.flatMap(({ province, districts }) => districts.map(({ name }) => [name, province])),
) as Record<string, RwandaProvince>

export function getAllDistricts() { return RWANDA_LOCATION_DATA.flatMap(({ districts }) => districts.map(({ name }) => name)) }
export function getDistrictsForProvince(province: string) { return RWANDA_DISTRICTS[province as RwandaProvince] || [] }
export function getProvinceByDistrict(district: string): RwandaProvince | null { return DISTRICT_TO_PROVINCE_MAP[district] || null }
export function getSectorsForDistrict(district: string) { return RWANDA_SECTORS[district] || [] }
export const getSectorsByDistrict = getSectorsForDistrict

function districtTree(district: string) {
  const province = getProvinceByDistrict(district)
  return province ? provinceTree(province)[district] || {} : {}
}
export function getCellsForSector(district: string, sector: string) { return Object.keys(districtTree(district)[sector] || {}) }
export function getVillagesForCell(district: string, sector: string, cell: string) { return districtTree(district)[sector]?.[cell] || [] }

export function getDistrictInfo(district: string) {
  for (const location of RWANDA_LOCATION_DATA) {
    const found = location.districts.find(({ name }) => name === district)
    if (found) return { ...found, province: location.province }
  }
  return null
}
export function getDeliveryInfoForDistrict(district: string) {
  const info = getDistrictInfo(district)
  if (!info) return null
  return {
    fee: info.deliveryFee,
    days: info.deliveryDays,
    isSameDay: info.isSameDay,
    province: info.province,
    deliveryLabel: info.isSameDay ? 'Same day where available' : `${info.deliveryDays}-${info.deliveryDays + 1} business days`,
  }
}
export function isValidRwandaLocation(province: string, district: string, sector?: string, cell?: string, village?: string) {
  if (!getDistrictsForProvince(province).includes(district)) return false
  if (sector && !getSectorsForDistrict(district).includes(sector)) return false
  if (cell && (!sector || !getCellsForSector(district, sector).includes(cell))) return false
  if (village && (!sector || !cell || !getVillagesForCell(district, sector, cell).includes(village))) return false
  return true
}

/** Format partial Rwanda mobile input without inventing digits. */
export function formatRwandaPhone(input: string) {
  let digits = input.replace(/\D/g, '')
  if (digits.startsWith('250')) digits = digits.slice(3)
  else if (digits.startsWith('0')) digits = digits.slice(1)
  digits = digits.slice(0, 9)
  const groups = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9)].filter(Boolean)
  return `+250${groups.length ? ` ${groups.join(' ')}` : ' '}`
}
export function normalizeRwandaPhone(input: string) {
  let digits = input.replace(/\D/g, '')
  if (digits.startsWith('250')) digits = digits.slice(3)
  else if (digits.startsWith('0')) digits = digits.slice(1)
  return `+250${digits.slice(0, 9)}`
}
function localPhone(input: string) { return normalizeRwandaPhone(input).slice(4) }
export function isMTNNumber(input: string) { return /^7[89]\d{7}$/.test(localPhone(input)) }
export function isAirtelNumber(input: string) { return /^7[23]\d{7}$/.test(localPhone(input)) }
