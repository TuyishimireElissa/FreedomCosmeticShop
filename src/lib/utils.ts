import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRWF(amount: number): string {
  return new Intl.NumberFormat('en-RW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' RWF'
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (phone.startsWith('+250')) return phone
  if (cleaned.startsWith('250')) return '+' + cleaned
  if (cleaned.startsWith('0')) {
    return '+250' + cleaned.substring(1)
  }
  return '+250' + cleaned
}

export function isMTNPhone(phone: string): boolean {
  const n = phone.replace(/\D/g,'').replace(/^250/,'').replace(/^0/,'')
  return /^(78|79)\d{7}$/.test(n)
}

export function isAirtelPhone(phone: string): boolean {
  const n = phone.replace(/\D/g,'').replace(/^250/,'').replace(/^0/,'')
  return /^(73|72)\d{7}$/.test(n)
}

export function formatPriceRWF(amount: number): string {
  return formatRWF(amount)
}

export function getDeliveryFee(district: string): number {
  const fees: Record<string, number> = {
    Gasabo: 1000, Kicukiro: 1000, Nyarugenge: 1000,
    Burera: 3000, Gakenke: 3000, Gicumbi: 3000,
    Musanze: 3000, Rulindo: 3000,
    Gisagara: 3000, Huye: 3000, Kamonyi: 3000,
    Muhanga: 3000, Nyamagabe: 3000, Nyanza: 3000,
    Nyaruguru: 3000, Ruhango: 3000,
    Bugesera: 3500, Gatsibo: 3500, Kayonza: 3500,
    Kirehe: 3500, Ngoma: 3500, Nyagatare: 3500,
    Rwamagana: 3500,
    Karongi: 4000, Ngororero: 4000, Nyabihu: 4000,
    Nyamasheke: 4000, Rubavu: 4000, Rusizi: 4000,
    Rutsiro: 4000,
  }
  return fees[district] || 3000
}

export const RWANDA_DISTRICTS = {
  'Kigali City': [
    'Gasabo', 'Kicukiro', 'Nyarugenge'
  ],
  'Northern Province': [
    'Burera', 'Gakenke', 'Gicumbi', 'Musanze', 'Rulindo'
  ],
  'Southern Province': [
    'Gisagara', 'Huye', 'Kamonyi', 'Muhanga',
    'Nyamagabe', 'Nyanza', 'Nyaruguru', 'Ruhango'
  ],
  'Eastern Province': [
    'Bugesera', 'Gatsibo', 'Kayonza', 'Kirehe',
    'Ngoma', 'Nyagatare', 'Rwamagana'
  ],
  'Western Province': [
    'Karongi', 'Ngororero', 'Nyabihu', 'Nyamasheke',
    'Rubavu', 'Rusizi', 'Rutsiro'
  ],
}

export const RWANDA_PROVINCES = Object.keys(RWANDA_DISTRICTS)

export function formatRWFCompact(amount: number): string {
  if (amount >= 1_000_000) return `RWF ${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `RWF ${(amount / 1_000).toFixed(1)}k`
  return `RWF ${amount}`
}

export function deliveryFeeFor(province: string): number {
  const map: Record<string, number> = {
    'Kigali City': 1000,
    'Northern Province': 3000,
    'Southern Province': 3000,
    'Eastern Province': 3500,
    'Western Province': 4000,
  }
  return map[province] ?? 3000
}

export const CURRENCY = {
  code: 'RWF',
  symbol: 'RWF',
  locale: 'en-RW',
  freeDeliveryThreshold: 50000,
}
