import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatRWF(amount: number): string {
  return `${new Intl.NumberFormat('en-RW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)} RWF`
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (phone.startsWith('+250')) return phone
  if (cleaned.startsWith('250')) return `+${cleaned}`
  if (cleaned.startsWith('0')) return `+250${cleaned.substring(1)}`
  return `+250${cleaned}`
}

export function isMTNPhone(phone: string): boolean {
  const normalized = phone.replace(/\D/g, '').replace(/^250/, '').replace(/^0/, '')
  return /^(78|79)\d{7}$/.test(normalized)
}

export function isAirtelPhone(phone: string): boolean {
  const normalized = phone.replace(/\D/g, '').replace(/^250/, '').replace(/^0/, '')
  return /^(72|73)\d{7}$/.test(normalized)
}

// Canonical aliases retained for callers that use the network-number naming.
export const isMTNNumber = isMTNPhone
export const isAirtelNumber = isAirtelPhone

export function getDeliveryFee(district: string): number {
  const fees: Record<string, number> = {
    Gasabo: 1000,
    Kicukiro: 1000,
    Nyarugenge: 1000,
    Burera: 3000,
    Gakenke: 3000,
    Gicumbi: 3000,
    Musanze: 3000,
    Rulindo: 3000,
    Gisagara: 3000,
    Huye: 3000,
    Kamonyi: 3000,
    Muhanga: 3000,
    Nyamagabe: 3000,
    Nyanza: 3000,
    Nyaruguru: 3000,
    Ruhango: 3000,
    Bugesera: 3500,
    Gatsibo: 3500,
    Kayonza: 3500,
    Kirehe: 3500,
    Ngoma: 3500,
    Nyagatare: 3500,
    Rwamagana: 3500,
    Karongi: 4000,
    Ngororero: 4000,
    Nyabihu: 4000,
    Nyamasheke: 4000,
    Rubavu: 4000,
    Rusizi: 4000,
    Rutsiro: 4000,
  }
  return fees[district] ?? 3000
}

export const RWANDA_DISTRICTS = {
  'Kigali City': ['Gasabo', 'Kicukiro', 'Nyarugenge'],
  'Northern Province': ['Burera', 'Gakenke', 'Gicumbi', 'Musanze', 'Rulindo'],
  'Southern Province': [
    'Gisagara',
    'Huye',
    'Kamonyi',
    'Muhanga',
    'Nyamagabe',
    'Nyanza',
    'Nyaruguru',
    'Ruhango',
  ],
  'Eastern Province': ['Bugesera', 'Gatsibo', 'Kayonza', 'Kirehe', 'Ngoma', 'Nyagatare', 'Rwamagana'],
  'Western Province': ['Karongi', 'Ngororero', 'Nyabihu', 'Nyamasheke', 'Rubavu', 'Rusizi', 'Rutsiro'],
} as const
