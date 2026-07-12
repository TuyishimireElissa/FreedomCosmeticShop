export const dynamic = 'force-dynamic'

/**
 * GET /api/banners - with fallback
 */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

const fallbackBanners = [
  {
    id: "banner_hero",
    title: "Rwanda's #1 Beauty Store 🇷🇼",
    subtitle: "100% Authentic Products. Shop skincare, makeup & haircare. Pay with MTN MoMo.",
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1200&auto=format&fit=crop",
    mobileImage: null,
    linkType: null,
    linkUrl: null,
    placement: "HOME_HERO",
    sortOrder: 0,
    isActive: true,
  },
  {
    id: "banner_promo",
    title: "Beauty that unites us ✨",
    subtitle: "Made for Rwandan beauty - Shades for melanin-rich skin",
    image: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=1200&auto=format&fit=crop",
    mobileImage: null,
    linkType: null,
    linkUrl: null,
    placement: "HOME_HERO",
    sortOrder: 1,
    isActive: true,
  }
]

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const placement = searchParams.get("placement")

    try {
      const now = new Date()
      const banners = await db.banner.findMany({
        where: {
          isActive: true,
          ...(placement ? { placement } : {}),
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
          ],
        },
        orderBy: { sortOrder: "asc" },
      })
      if (banners.length === 0) {
        const filtered = placement ? fallbackBanners.filter(b => b.placement === placement) : fallbackBanners
        return NextResponse.json({ banners: filtered, _source: "fallback-empty" })
      }
      return NextResponse.json({ banners, _source: "database" })
    } catch (dbError) {
      console.warn("Banners DB failed, fallback:", dbError)
      const filtered = placement ? fallbackBanners.filter(b => b.placement === placement) : fallbackBanners
      return NextResponse.json({ banners: filtered, _source: "fallback-error" })
    }
  } catch (error) {
    console.error("Failed to fetch banners:", error)
    return NextResponse.json({ banners: fallbackBanners })
  }
}
