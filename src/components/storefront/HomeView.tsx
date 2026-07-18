"use client"

/**
 * HomeView for FreedomCosmeticShop — complete homepage with all sections.
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

import { useCallback, useEffect, useState } from "react"
import { useStore } from "@/store/useStore"
import { Product, Category } from "@/lib/types"
import { HeroBanner } from "@/components/home/HeroBanner"
import { CategoryGrid } from "@/components/home/CategoryGrid"
import { FlashSale } from "@/components/home/FlashSale"
import { useProductUpdates, useBannerUpdates, usePromotionUpdates, useBlogUpdates, useCategoryUpdates } from "@/hooks/use-realtime"
import { ProductSection } from "@/components/home/ProductSection"
import { BrandCarousel } from "@/components/home/BrandCarousel"
import { BeautyTips } from "@/components/home/BeautyTips"
import { ReviewsCarousel } from "@/components/home/ReviewsCarousel"
import { SpecialOffers } from "@/components/home/SpecialOffers"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Truck, Smartphone, ShieldCheck, Sparkles } from "lucide-react"
import { useT } from '@/lib/i18n/LanguageContext'
import LazySection from '@/components/ui/LazySection'

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
  titleRw?: string | null
  slug: string
  excerpt: string | null
  excerptRw?: string | null
  coverImage: string | null
  imageAlt?: string | null
  imageAltRw?: string | null
  tags: string[]
  publishedAt: string | null
  viewCount: number
}

export function HomeView() {
  const t = useT()
  const { goCatalog } = useStore()

  const [banners, setBanners] = useState<Banner[]>([])
  const [bestSellers, setBestSellers] = useState<Product[]>([])
  const [newArrivals, setNewArrivals] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [brandsLoading, setBrandsLoading] = useState(false)
  const [blogLoading, setBlogLoading] = useState(false)
  const [blogRequested, setBlogRequested] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [
          bannersRes,
          bestSellersRes,
          newArrivalsRes,
          catsRes,
        ] = await Promise.all([
          fetch("/api/banners?placement=HOME_HERO"),
          fetch("/api/products?sort=rating&limit=8"),
          fetch("/api/products?sort=newest&limit=4"),
          fetch("/api/categories"),
        ])

        const bannersJson = await bannersRes.json()
        const bestJson = await bestSellersRes.json()
        const newJson = await newArrivalsRes.json()
        const catsJson = await catsRes.json()

        if (cancelled) return

        setBanners(bannersJson.banners || [])
        setBestSellers(bestJson.products || [])
        setNewArrivals(newJson.products || [])
        setCategories(catsJson.categories || [])
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

  const loadBrands = useCallback(() => {
    setBrandsLoading(true)
    fetch('/api/brands')
      .then((response) => response.json())
      .then((data) => setBrands(data.brands || []))
      .catch(() => setBrands([]))
      .finally(() => setBrandsLoading(false))
  }, [])

  const loadBlog = useCallback(() => {
    setBlogRequested(true)
    setBlogLoading(true)
    fetch('/api/blog?limit=3')
      .then((response) => response.json())
      .then((data) => setBlogPosts(data.posts || []))
      .catch(() => setBlogPosts([]))
      .finally(() => setBlogLoading(false))
  }, [])

  // ─── Section 2: Real-time product updates ─────────────────────────
  // When admin updates a product that appears in Best Sellers or New Arrivals,
  // update it in-place. When a product is deleted, remove it. When a new
  // product is created, refetch New Arrivals (since it might qualify).
  useProductUpdates((event, data) => {
    const p = data as { id: string; name: string; price?: number; stock?: number; featured?: boolean }

    if (event === "product:created") {
      // Refetch new arrivals to pick up the new product
      fetch("/api/products?sort=newest&limit=4")
        .then((r) => r.json())
        .then((d) => setNewArrivals(d.products || []))
        .catch(() => {})
    } else if (event === "product:updated" || event === "product:priceChange" || event === "product:stockLow" || event === "product:outOfStock") {
      // Update in-place in both lists
      const updateFn = (item: Product) =>
        item.id === p.id
          ? {
              ...item,
              name: p.name ?? item.name,
              price: p.price ?? item.price,
              stock: p.stock ?? item.stock,
            }
          : item
      setBestSellers((prev) => prev.map(updateFn))
      setNewArrivals((prev) => prev.map(updateFn))
    } else if (event === "product:deleted") {
      // Remove from both lists
      setBestSellers((prev) => prev.filter((item) => item.id !== p.id))
      setNewArrivals((prev) => prev.filter((item) => item.id !== p.id))
    }
  })

  // ─── Section 4: Real-time banner updates ──────────────────────────
  // When admin creates/updates/deletes a banner, refetch the homepage
  // banners so the hero slider updates instantly.
  useBannerUpdates((event) => {
    if (event === "banner:created" || event === "banner:updated" || event === "banner:deleted") {
      // Refetch banners from the public API
      fetch("/api/banners?placement=HOME_HERO")
        .then((r) => r.json())
        .then((d) => setBanners(d.banners || []))
        .catch(() => {})
    }
  })

  // ─── Section 4: Real-time promotion/coupon updates ────────────────
  // When admin starts/ends a flash sale or creates/deactivates a coupon,
  // the FlashSale component will pick up the change on its next render.
  // We don't need to do anything special here — the FlashSale component
  // has its own refresh logic. But we could force a re-render if needed.
  usePromotionUpdates(() => {
    // Promotion events are handled by the FlashSale component itself.
    // This hook is here to ensure the SSE listener is registered early.
  })

  // ─── Section 6: Real-time blog + category updates ─────────────────
  // When admin publishes/unpublishes/updates a blog post, refetch the
  // blog posts so the BeautyTips section updates instantly.
  useBlogUpdates(() => {
    if (blogRequested) loadBlog()
  })

  // When admin creates/updates/deactivates a category, refetch the
  // categories so the CategoryGrid + navigation update instantly.
  useCategoryUpdates(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
      .catch(() => {})
  })

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
              title: t('footer.fast_delivery'),
              desc: t('home.delivery_days'),
            },
            {
              icon: Smartphone,
              title: t('home.momo_cod'),
              desc: t('home.pay_your_way'),
            },
            {
              icon: ShieldCheck,
              title: t('home.authentic_products'),
              desc: t('home.authorized_genuine'),
            },
            {
              icon: Sparkles,
              title: t('home.made_for_rwanda'),
              desc: t('home.melanin_formulas'),
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
        title={t('categories.best_sellers')}
        subtitle={t('home.best_sellers_subtitle')}
        badge={t('home.top_rated')}
        products={bestSellers}
        loading={loading}
        onViewAll={() => goCatalog(null)}
      />

      {/* 5. Special Offers */}
      <SpecialOffers
        code="WEEKEND15"
        description={t('home.weekend_offer')}
        discount={t('home.weekend_discount')}
      />

      {/* 6. New Arrivals */}
      <ProductSection
        title={t('categories.new_arrivals')}
        subtitle={t('home.new_arrivals_subtitle')}
        badge={`✨ ${t('common.new')}`}
        products={newArrivals}
        loading={loading}
        onViewAll={() => goCatalog(null)}
      />

      {/* 7. Top Brands Carousel — explicit in low-data mode */}
      <LazySection label={t('home.top_brands')} onLoad={loadBrands}>
        {brandsLoading ? <Skeleton className="mx-auto my-8 h-48 w-[calc(100%-2rem)] max-w-7xl rounded-2xl" /> : brands.length > 0 && <BrandCarousel brands={brands} />}
      </LazySection>

      {/* 8. Beauty Tips Preview (Blog) — explicit in low-data mode */}
      <LazySection label={t('home.beauty_guides')} onLoad={loadBlog}>
        {blogLoading ? <Skeleton className="mx-auto my-8 h-64 w-[calc(100%-2rem)] max-w-7xl rounded-2xl" /> : blogPosts.length > 0 && <BeautyTips posts={blogPosts} />}
      </LazySection>

      {/* 9. Customer Reviews Carousel — explicit in low-data mode */}
      <LazySection label={t('home.section_reviews')}>
        <ReviewsCarousel />
      </LazySection>

      {/* 10. Section 4: Wholesale CTA Banner */}
      <WholesaleCtaBanner />
    </div>
  )
}

// ─── Section 4: Wholesale CTA Banner ─────────────────────────────────────────

function WholesaleCtaBanner() {
  const t = useT()
  const { user, setView } = useStore()
  const isWholesale = user?.userType === "WHOLESALE" || user?.userType === "BOTH"

  // Don't show to approved wholesale customers
  if (isWholesale && user?.wholesaleStatus === "APPROVED") return null

  return (
    <section className="bg-gradient-to-br from-primary to-primary/80 px-4 py-10 text-primary-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        <p className="text-3xl">🏪</p>
        <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
          {t('home.salon_shop_owner')}
        </h2>
        <p className="mt-2 text-sm text-primary-foreground/90">
          {t('home.join_wholesale_program')}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {[
            { icon: "💰", label: t('home.up_to_off') },
            { icon: "🚚", label: t('home.priority_delivery') },
            { icon: "📄", label: t('home.pro_invoices') },
            { icon: "💳", label: t('home.credit_available') },
            { icon: "📦", label: t('home.bulk_support') },
            { icon: "🏆", label: t('home.loyalty_rewards') },
          ].map((b) => (
            <div key={b.label} className="rounded-xl bg-primary-foreground/10 p-3 text-center">
              <p className="text-2xl">{b.icon}</p>
              <p className="mt-1 text-[10px] font-medium">{b.label}</p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-primary-foreground/80">
          {t('home.wholesale_minimum_audience')}
        </p>

        <Button
          size="lg"
          variant="secondary"
          className="mt-6"
          onClick={() => setView("wholesale" as never)}
        >
          {t('home.apply_wholesale_account')} →
        </Button>
      </div>
    </section>
  )
}
