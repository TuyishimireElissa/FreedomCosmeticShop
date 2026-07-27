/** GET /api/wholesale/info — public, fail-closed wholesale configuration */
import { NextResponse } from 'next/server'
import { WHOLESALE_CONFIG } from '@/lib/wholesale-config'

export async function GET() {
  return NextResponse.json({
    pricingMode: WHOLESALE_CONFIG.pricing.mode,
    minimumOrder: WHOLESALE_CONFIG.minimumOrderRwf,
    minimumOrderFormatted: null,
    maxDiscount: null,
    creditEnabled: WHOLESALE_CONFIG.credit.enabled,
    applicationReviewTargetHours: WHOLESALE_CONFIG.applicationReviewTargetHours,
    benefits: [],
    businessTypes: [
      'BEAUTY_SALON', 'HAIR_SALON', 'SPA', 'SHOP', 'MARKET_VENDOR',
      'BEAUTY_SCHOOL', 'HOTEL', 'RESELLER', 'OTHER',
    ],
    exampleTiers: [],
    howItWorks: [],
  })
}
