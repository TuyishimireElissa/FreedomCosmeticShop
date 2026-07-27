const configuredWhatsApp = (process.env.NEXT_PUBLIC_WHATSAPP || '').replace(/\D/g, '')
const wholesaleContacts = configuredWhatsApp
  ? [{ name: 'FreedomCosmeticShop', whatsappE164: configuredWhatsApp, displayPhone: process.env.NEXT_PUBLIC_WHATSAPP || configuredWhatsApp }]
  : []

export const WHOLESALE_CONFIG = {
  pricing: {
    mode: 'PRODUCT_ONLY' as const,
    allowAccountLevelDiscount: false,
  },
  minimumOrderRwf: null as number | null,
  credit: { enabled: false },
  applicationReviewTargetHours: null as number | null,
  contacts: wholesaleContacts,
} as const

export function hasConfiguredWholesaleMinimum(): boolean {
  return WHOLESALE_CONFIG.minimumOrderRwf !== null
}

export function hasPublishedWholesaleReviewTarget(): boolean {
  return WHOLESALE_CONFIG.applicationReviewTargetHours !== null
}
