export const WHOLESALE_CONFIG = {
  pricing: {
    mode: 'PRODUCT_ONLY' as const,
    allowAccountLevelDiscount: false,
  },
  minimumOrderRwf: null as number | null,
  credit: {
    enabled: false,
  },
  applicationReviewTargetHours: null as number | null,
  contacts: [
    { name: 'FreedomCosmeticShop', whatsappE164: '250790215965', displayPhone: '0790 215 965' },
    { name: 'FreedomCosmeticShop', whatsappE164: '250785361796', displayPhone: '0785 361 796' },
  ],
} as const

export function hasConfiguredWholesaleMinimum(): boolean {
  return WHOLESALE_CONFIG.minimumOrderRwf !== null
}

export function hasPublishedWholesaleReviewTarget(): boolean {
  return WHOLESALE_CONFIG.applicationReviewTargetHours !== null
}
