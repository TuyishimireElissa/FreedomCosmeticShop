/** GET /api/wholesale/info — public wholesale benefits info */
import { NextResponse } from "next/server"
import { WHOLESALE_MIN_ORDER, getDefaultTiers } from "@/server/services/wholesale"

export async function GET() {
  return NextResponse.json({
    minimumOrder: WHOLESALE_MIN_ORDER,
    minimumOrderFormatted: `${WHOLESALE_MIN_ORDER.toLocaleString()} RWF`,
    maxDiscount: 29,
    benefits: [
      { icon: "💰", title: "Up to 30% discount", desc: "On all products when you buy in bulk" },
      { icon: "🚚", title: "Priority delivery", desc: "Fast bulk delivery across Rwanda" },
      { icon: "📄", title: "Professional invoices", desc: "TIN receipts and invoices provided" },
      { icon: "💳", title: "Credit available", desc: "Pay later with credit terms (30 days)" },
      { icon: "📦", title: "Bulk order support", desc: "Dedicated account manager" },
      { icon: "🏆", title: "Loyalty rewards", desc: "Earn points on every wholesale order" },
    ],
    businessTypes: [
      "BEAUTY_SALON", "HAIR_SALON", "SPA", "SHOP", "MARKET_VENDOR",
      "BEAUTY_SCHOOL", "HOTEL", "RESELLER", "OTHER",
    ],
    exampleTiers: getDefaultTiers(8500),
    howItWorks: [
      { step: 1, title: "Apply online", desc: "5-minute application form" },
      { step: 2, title: "We review", desc: "24-48 hours review time" },
      { step: 3, title: "Get approved", desc: "Access wholesale prices + credit" },
      { step: 4, title: "Order and save!", desc: "Up to 30% off all products" },
    ],
  })
}
