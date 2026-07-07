"use client"

/**
 * HomeView for Ubumwe Beauty — complete homepage with all sections.
 *
 * Sections (in order):
 *   1. Hero Banner Slider (auto-sliding)
 *   2. Trust Bar (delivery, payment, authenticity)
 *   3. Category Grid
 *   4. Best Sellers (ProductSection)
 *   5. Special Offers Banner
 *   6. New Arrivals (ProductSection)
 *   7. Top Brands Carousel
 *   8. Beauty Tips Preview (Blog)
 *   9. Customer Reviews Carousel
 *
 * Data is fetched from /api/banners, /api/products, /api/categories,
 * /api/brands, and /api/blog on mount.
 */

import { useEffect, useState } from "react"
import { useStore } from "@/store/useStore"
import { Product, Category } from "@/lib/types"
import { HeroBanner } from "@/components/home/HeroBanner"
import { CategoryGrid } from "@/components/home/CategoryGrid"
import { FlashSale } from "@/components/home/FlashSale"
import { ProductSection } from "@/components/home/ProductSection"
import { BrandCarousel } from "@/components/home/BrandCarousel"
import { BeautyTips } from "@/components/home/BeautyTips"
import { ReviewsCarousel } from "@/components/home/ReviewsCarousel"
import { SpecialOffers } from "@/components/home/SpecialOffers"
import { Skeleton } from "@/components/ui/skeleton"
import { Truck, Smartphone, ShieldCheck, Sparkles } from "lucide-react"

interface Banner {
  id: string
  title: string
  subtitle: string | null
  image: string
  mobileImage: string | null
  linkType: string | null
  linkUrl: string | null
  placement: string
}

interface Brand {
  id: string
  name: string
  slug: string
  description: string | null
  logo: string | null
  country: string | null
  _count?: { products: number }
}

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  coverImage: string | null
  tags: string[]
  publishedAt: string | null
  viewCount: number
}

export function HomeView() {
  const { goCatalog } = useStore()

  const [banners, setBanners] = useState<Banner[]>([])
  const [bestSellers, setBestSellers] = useState<Product[]>([])
  const [newArrivals, setNewArrivals] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [
          bannersRes,
          bestSellersRes,
          newArrivalsRes,
          catsRes,
          brandsRes,
          blogRes,
        ] = await Promise.all([
          fetch("/api/banners?placement=HOME_HERO"),
          fetch("/api/products?sort=rating&limit=8"),
          fetch("/api/products?sort=newest&limit=4"),
          fetch("/api/categories"),
          fetch("/api/brands"),
          fetch("/api/blog?limit=3"),
        ])

        const bannersJson = await bannersRes.json()
        const bestJson = await bestSellersRes.json()
        const newJson = await newArrivalsRes.json()
        const catsJson = await catsRes.json()
        const brandsJson = await brandsRes.json()
        const blogJson = await blogRes.json()

        if (cancelled) return

        setBanners(bannersJson.banners || [])
        setBestSellers(bestJson.products || [])
        setNewArrivals(newJson.products || [])
        setCategories(catsJson.categories || [])
        setBrands(brandsJson.brands || [])
        setBlogPosts(blogJson.posts || [])
      } catch (e) {
        console.error("HomeView load failed:", e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex flex-col">
      {/* 1. Hero Banner Slider */}
      <HeroBanner banners={banners} />

      {/* 2. Trust Bar */}
      <section className="border-y bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-6 sm:px-6 md:grid-cols-4 lg:px-8">
          {[
            {
              icon: Truck,
              title: "Fast delivery",
              desc: "1-3 days in Kigali, 3-5 days in provinces",
            },
            {
              icon: Smartphone,
              title: "MTN MoMo & COD",
              desc: "Pay your way — mobile money or cash",
            },
            {
              icon: ShieldCheck,
              title: "Authentic products",
              desc: "100% genuine, sourced from authorized distributors",
            },
            {
              icon: Sparkles,
              title: "Made for Rwanda",
              desc: "Shades & formulas for melanin-rich skin",
            },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-primary">
                <item.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Category Grid */}
      {loading ? (
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <Skeleton className="mb-6 h-8 w-48" />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="aspect-square rounded-2xl" />
            ))}
          </div>
        </div>
      ) : (
        <CategoryGrid categories={categories} />
      )}

      {/* 3b. Flash Sale — NEW */}
      <FlashSale />

      {/* 4. Best Sellers */}
      <ProductSection
        title="Best sellers"
        subtitle="Customer favorites, handpicked for you."
        badge="★ Top rated"
        products={bestSellers}
        loading={loading}
        onViewAll={() => goCatalog(null)}
      />

      {/* 5. Special Offers */}
      <SpecialOffers
        code="WEEKEND15"
        description="15% off on weekends. Pay with MTN MoMo or cash on delivery. Min order RWF 10,000."
        discount="15% OFF"
      />

      {/* 6. New Arrivals */}
      <ProductSection
        title="New arrivals"
        subtitle="The latest additions to our shelves."
        badge="✨ New"
        products={newArrivals}
        loading={loading}
        onViewAll={() => goCatalog(null)}
      />

      {/* 7. Top Brands Carousel */}
      {!loading && brands.length > 0 && <BrandCarousel brands={brands} />}

      {/* 8. Beauty Tips Preview (Blog) */}
      {!loading && blogPosts.length > 0 && <BeautyTips posts={blogPosts} />}

      {/* 9. Customer Reviews Carousel */}
      <ReviewsCarousel />
    </div>
  )
}
