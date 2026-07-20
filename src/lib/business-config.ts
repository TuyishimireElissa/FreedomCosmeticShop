/**
 * FreedomCosmeticShop Business Configuration
 *
 * ⚠️ OWNER: Update all [TODO] fields before launch.
 * Search for: TODO: OWNER_MUST_ADD_THIS_BEFORE_LAUNCH
 * Replace each marker with verified, real business information.
 */

export const OWNER_TODO = '[TODO: OWNER_MUST_ADD_THIS_BEFORE_LAUNCH]' as const
const TODO_MARKER = 'TODO: OWNER_MUST_ADD_THIS_BEFORE_LAUNCH'

export const BUSINESS = {
  // ═══════════════════════════════════
  // BUSINESS IDENTITY
  // ═══════════════════════════════════
  name: 'FreedomCosmeticShop',
  legalName: OWNER_TODO,
  tradingName: 'FreedomCosmeticShop',
  rdbNumber: OWNER_TODO,
  tinNumber: OWNER_TODO,
  tagline: "Rwanda's Beauty Freedom",
  description:
    'Online cosmetics catalogue for customers in Rwanda. ' +
    'Browse current skincare, makeup and haircare listings, view prices in RWF, ' +
    'and check available payment and district delivery information.',

  // ═══════════════════════════════════
  // CONTACT INFORMATION
  // ═══════════════════════════════════
  phone: OWNER_TODO,
  phoneDisplay: OWNER_TODO,
  // Owner-confirmed WhatsApp Business contact (international format).
  whatsapp: '+250780000000',
  whatsappMessage: 'Hello FreedomCosmeticShop! I need help with my order.',
  email: OWNER_TODO,
  emailSupport: OWNER_TODO,
  emailInvoices: OWNER_TODO,
  emailDomain: OWNER_TODO,

  // ═══════════════════════════════════
  // SUPPORT HOURS
  // ═══════════════════════════════════
  supportHours: {
    weekdays: OWNER_TODO,
    saturday: OWNER_TODO,
    sunday: OWNER_TODO,
    timezone: 'Africa/Kigali (CAT - UTC+2)',
    emergency: 'WhatsApp only outside business hours',
  },

  // ═══════════════════════════════════
  // PHYSICAL ADDRESS
  // ═══════════════════════════════════
  address: {
    street: OWNER_TODO,
    sector: OWNER_TODO,
    district: OWNER_TODO,
    city: 'Kigali',
    country: 'Rwanda',
    landmark: OWNER_TODO,

    get full() {
      return `${this.street}, ${this.sector}, ${this.district}, ${this.city}, ${this.country}`
    },

    get short() {
      return `${this.sector}, ${this.district}, ${this.city}`
    },

    googleMapsLink: OWNER_TODO,
  },

  // ═══════════════════════════════════
  // RETURN ADDRESS
  // ═══════════════════════════════════
  returnAddress: {
    sameAsPhysical: true,
    street: OWNER_TODO,
    sector: OWNER_TODO,
    district: OWNER_TODO,
    city: 'Kigali',
    country: 'Rwanda',
    instructions: 'Call before returning any item.',
  },

  // ═══════════════════════════════════
  // SOCIAL MEDIA
  // Unverified accounts use OWNER_TODO and remain hidden by hasSocial().
  // Set a verified URL for an existing account, or null if it does not exist.
  // ═══════════════════════════════════
  social: {
    instagram: OWNER_TODO as string | null,
    facebook: OWNER_TODO as string | null,
    tiktok: OWNER_TODO as string | null,
    youtube: OWNER_TODO as string | null,
    twitter: OWNER_TODO as string | null,
  },

  // ═══════════════════════════════════
  // WEBSITE & DOMAIN
  // ═══════════════════════════════════
  domain: 'freedom-cosmetic-shop.vercel.app',
  url: 'https://freedom-cosmetic-shop.vercel.app',
  adminUrl: 'https://freedom-cosmetic-shop.vercel.app/admin',

  // ═══════════════════════════════════
  // BUSINESS DETAILS FOR INVOICES
  // ═══════════════════════════════════
  invoice: {
    prefix: 'FCS',
    wholesalePrefix: 'FCS-WHL',
    currency: 'RWF',
    currencySymbol: 'RWF',
    vatRate: 18,
    paymentTerms: '30 days (wholesale only)',
    bankDetails: {
      bank: OWNER_TODO,
      accountName: OWNER_TODO,
      accountNumber: OWNER_TODO,
      swiftCode: OWNER_TODO,
    },
    momoPaymentNumber: OWNER_TODO,
  },

  // ═══════════════════════════════════
  // POLICIES
  // ═══════════════════════════════════
  policies: {
    returnDays: 30,
    returnCondition: 'Unopened and in original packaging',
    freeDeliveryThreshold: 50000,
    sameDayCutoff: '14:00',
    warrantyInfo: 'Authenticity information is displayed only when supported by verified product records.',
  },

  // ═══════════════════════════════════
  // LAUNCH CHECKLIST
  // ═══════════════════════════════════
  launchChecklist: [
    'Replace legalName with registered business name',
    'Replace rdbNumber with RDB registration number',
    'Replace tinNumber with Rwanda TIN',
    'Replace phone with real working phone number',
    'Replace email with real monitored email',
    'Replace address.street with real street',
    'Replace address.sector with real sector',
    'Replace address.district with real district',
    'Replace address.landmark with real landmark',
    'Replace supportHours with real business hours',
    'Set verified social media URLs or null for non-existent accounts',
    'Replace bankDetails with real bank account',
    'Replace momoPaymentNumber with real MTN number',
    'Replace googleMapsLink with real Maps link',
    'Test WhatsApp link opens correctly',
    'Test email address receives messages',
    'Test phone number is reachable',
  ],
} as const

/** Build the website WhatsApp URL without exposing an unconfigured placeholder. */
export function getWhatsAppLink(message?: string): string {
  if (BUSINESS.whatsapp.includes(TODO_MARKER)) {
    return '#owner-must-add-whatsapp-before-launch'
  }
  const phone = BUSINESS.whatsapp.replace(/\D/g, '')
  const text = encodeURIComponent(message || BUSINESS.whatsappMessage)
  return `https://wa.me/${phone}?text=${text}`
}

/** Return true only when the owner has supplied a verified social URL. */
export function hasSocial(platform: keyof typeof BUSINESS.social): boolean {
  const value = BUSINESS.social[platform]
  return value !== null && !value.includes(TODO_MARKER)
}

/** Return dot-separated config paths that still contain the owner TODO marker. */
export function getTODOItems(): string[] {
  const results: string[] = []

  function visit(value: unknown, path: string) {
    if (typeof value === 'string') {
      if (value.includes(TODO_MARKER)) results.push(path)
      return
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) return

    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      visit(child, path ? `${path}.${key}` : key)
    }
  }

  visit(BUSINESS, '')
  return results
}
