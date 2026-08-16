/**
 * FreedomCosmeticShop Business Configuration
 *
 *  OWNER: Update all [TODO] fields before launch.
 * Search for: TODO: OWNER_MUST_ADD_THIS_BEFORE_LAUNCH
 * Replace each marker with verified, real business information.
 */

export const OWNER_TODO = '[TODO: OWNER_MUST_ADD_THIS_BEFORE_LAUNCH]' as const
const TODO_MARKER = 'TODO: OWNER_MUST_ADD_THIS_BEFORE_LAUNCH'

/**
 * Owner-confirmed WhatsApp ordering numbers, in the order customers see them.
 *
 * These are real, verified numbers, so they live in code rather than behind an
 * owner TODO. An env var may still override a slot (useful for rotating a line
 * without a deploy), but only when it parses as a genuine Rwandan mobile
 * number — otherwise a stale or placeholder value would silently publish a
 * dead ordering line, which is exactly what `+250780000000` did in production.
 */
function resolveWhatsApp(candidate: string | undefined, confirmed: string): string {
  const digits = (candidate || '').replace(/\D/g, '')
  if (!/^2507[2389]\d{7}$/.test(digits)) return confirmed
  // Reject obvious filler (e.g. +250780000000) rather than publishing it.
  if (/^2507\d0{6,}$/.test(digits)) return confirmed
  return `+${digits}`
}

export const WHATSAPP_ORDERING_NUMBERS: readonly string[] = [
  resolveWhatsApp(process.env.NEXT_PUBLIC_WHATSAPP, '+250790215965'),
  resolveWhatsApp(process.env.NEXT_PUBLIC_WHATSAPP_ALT, '+250785361796'),
]

/**
 * Join address parts, dropping unfilled owner placeholders and collapsing
 * consecutive duplicates (a sector and its district often share a name).
 */
function joinAddressParts(parts: readonly (string | undefined)[]): string {
  const kept = parts.filter((part): part is string => Boolean(part) && !part!.includes(TODO_MARKER))
  return kept.filter((part, index) => index === 0 || part !== kept[index - 1]).join(', ')
}

/** `+250790215965` → `+250 790 215 965`, for display only. */
export function formatWhatsAppDisplay(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (!/^250\d{9}$/.test(digits)) return value
  return `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`
}


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
  // Owner-confirmed 2026-08-09. Same line as the primary WhatsApp number.
  phone: WHATSAPP_ORDERING_NUMBERS[0]!,
  phoneDisplay: formatWhatsAppDisplay(WHATSAPP_ORDERING_NUMBERS[0]!),
  // Primary ordering line. Every existing single-number call site keeps
  // working; the full list lives in WHATSAPP_ORDERING_NUMBERS above.
  whatsapp: WHATSAPP_ORDERING_NUMBERS[0]!,
  whatsappAlt: WHATSAPP_ORDERING_NUMBERS[1]!,
  whatsappMessage: 'Hello FreedomCosmeticShop! I need help with my order.',
  // One monitored inbox serves all three roles today. Kept as separate fields
  // so a dedicated support or billing address can be split out later without
  // touching call sites.
  email: 'freedomcosmeticshop@gmail.com',
  emailSupport: 'freedomcosmeticshop@gmail.com',
  emailInvoices: 'freedomcosmeticshop@gmail.com',
  // Gmail-hosted, so there is no custom mail domain to advertise.
  emailDomain: OWNER_TODO,

  // ═══════════════════════════════════
  // SUPPORT HOURS
  // ═══════════════════════════════════
  supportHours: {
    // Owner-confirmed 2026-08-09: Mon–Sat 8AM–8PM, Sun 10AM–6PM.
    weekdays: 'Monday - Saturday: 8:00 AM - 8:00 PM',
    saturday: 'Saturday: 8:00 AM - 8:00 PM',
    sunday: 'Sunday: 10:00 AM - 6:00 PM',
    timezone: 'Africa/Kigali (CAT - UTC+2)',
    emergency: 'WhatsApp only outside business hours',
  },

  // ═══════════════════════════════════
  // PHYSICAL ADDRESS
  // ═══════════════════════════════════
  address: {
    // Owner-confirmed 2026-08-09: Nyarugenge sector, Kigali. Street address,
    // landmark and Maps pin were not supplied, so they stay as placeholders
    // rather than being invented — the getters below simply omit them.
    street: OWNER_TODO,
    sector: 'Nyarugenge',
    district: 'Nyarugenge',
    city: 'Kigali',
    country: 'Rwanda',
    landmark: OWNER_TODO,

    // Placeholder parts are dropped instead of poisoning the whole string.
    // Previously a single unfilled field made `full` fail isPlaceholder(),
    // which hid the entire address everywhere it is guarded — so a
    // partially-known address rendered as nothing at all.
    //
    // Consecutive duplicates are collapsed too: Nyarugenge is both a sector
    // and the district containing it, and "Nyarugenge, Nyarugenge, Kigali"
    // reads like a mistake to a Rwandan customer.
    get full() {
      return joinAddressParts([this.street, this.sector, this.district, this.city, this.country])
    },

    get short() {
      return joinAddressParts([this.sector, this.district, this.city])
    },

    googleMapsLink: OWNER_TODO,
  },

  // ═══════════════════════════════════
  // RETURN ADDRESS
  // ═══════════════════════════════════
  returnAddress: {
    sameAsPhysical: true,
    street: OWNER_TODO,
    sector: 'Nyarugenge',
    district: 'Nyarugenge',
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
  /**
   * The custom domain, live since 2026-08-15.
   *
   * `url` is the fallback behind `NEXT_PUBLIC_APP_URL` in seo-config.ts:21, and
   * therefore the value that ends up in the canonical tag, og:url, sitemap.xml
   * and robots.txt whenever the environment variable is absent. While this said
   * `.vercel.app`, every page on freedomcosmeticshop.com carried a canonical
   * pointing at the old host — which told Google to keep indexing the old URL,
   * and pointed at a URL that 307-redirects straight back here.
   *
   * The old Vercel URL is not removed anywhere: Vercel still serves it and
   * 307s it to this domain, so existing links keep working.
   */
  domain: 'freedomcosmeticshop.com',
  url: 'https://freedomcosmeticshop.com',
  adminUrl: 'https://freedomcosmeticshop.com/admin',

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
export function getWhatsAppLink(message?: string, number?: string): string {
  const target = number || BUSINESS.whatsapp
  if (target.includes(TODO_MARKER)) {
    return '#owner-must-add-whatsapp-before-launch'
  }
  const phone = target.replace(/\D/g, '')
  const text = encodeURIComponent(message || BUSINESS.whatsappMessage)
  return `https://wa.me/${phone}?text=${text}`
}

/**
 * True when a business-config value is still an unfilled owner placeholder.
 *
 * The config deliberately refuses to invent contact details, but the raw
 * marker must never reach a customer's screen. Guard any `BUSINESS.*` string
 * with this before rendering it.
 */
export function isPlaceholder(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.includes(TODO_MARKER)
}

/** Return the value only when the owner has actually supplied it. */
export function realValue(value: string | null | undefined): string | null {
  return isPlaceholder(value) || !value ? null : value
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
