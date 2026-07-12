"use client"

import { useCallback, useEffect, useState } from "react"
import { RefreshCw, ShieldCheck, Sparkles, Smartphone, Truck } from "lucide-react"
import type { Category, Product } from "@/lib/types"
import { useStore } from "@/store/useStore"
import { CartDrawer } from "@/components/storefront/CartDrawer"
import { CatalogView } from "@/components/storefront/CatalogView"
import { ProductDetailView } from "@/components/storefront/ProductDetailView"
import { CartView } from "@/components/storefront/CartView"
import { CheckoutView } from "@/components/storefront/CheckoutView"
import { ConfirmationView } from "@/components/storefront/ConfirmationView"
import { AdminView } from "@/components/admin/AdminView"
import { LoginView } from "@/components/auth/LoginView"
import { RegisterView } from "@/components/auth/RegisterView"
import { AccountView } from "@/components/auth/AccountView"
import { TrackOrderView } from "@/components/storefront/TrackOrderView"
import { WholesaleView } from "@/components/wholesale/WholesaleView"
import { ErrorBoundary } from "@/components/error-boundary"
import { HeroBanner, type HomeBanner } from "@/components/home/HeroBanner"
import { CategoryGrid } from "@/components/home/CategoryGrid"
import { ProductSection } from "@/components/home/ProductSection"
import { FlashSale } from "@/components/home/FlashSale"
import { BrandCarousel } from "@/components/home/BrandCarousel"
import { WholesaleBanner } from "@/components/home/WholesaleBanner"
import { ReviewsSection } from "@/components/home/ReviewsSection"
import { BeautyTips } from "@/components/home/BeautyTips"
import {
  useBannerUpdates,
  useBlogUpdates,
  useCategoryUpdates,
  useProductUpdates,
  usePromotionUpdates,
  useRealtimeEvents,
} from "@/hooks/use-realtime"

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

interface ApiResource<T> {
  data: T | null
  loading: boolean
  error: string | null
  retry: () => void
}

function useApiResource<T>(url: string): ApiResource<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [request, setRequest] = useState(0)

  const retry = useCallback(() => setRequest((value) => value + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    fetch(url, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          const result = await response.json().catch(() => null)
          throw new Error(result?.error || `Request failed (${response.status})`)
        }
        return response.json() as Promise<T>
      })
      .then(setData)
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return
        setError(reason instanceof Error ? reason.message : "Unable to load this section")
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [request, url])

  return { data, loading, error, retry }
}

function Homepage() {
  const goCatalog = useStore((state) => state.goCatalog)
  const banners = useApiResource<{ banners: HomeBanner[] }>("/api/banners?placement=HOME_HERO")
  const categories = useApiResource<{ categories: Category[] }>("/api/categories")
  const bestSellers = useApiResource<{ products: Product[] }>("/api/products?sort=best-selling&pageSize=8&inStock=true")
  const flashSale = useApiResource<{ products: Product[] }>("/api/products?sort=price-desc&pageSize=16&inStock=true")
  const newArrivals = useApiResource<{ products: Product[] }>("/api/products?sort=newest&pageSize=8&inStock=true")
  const brands = useApiResource<{ brands: Brand[] }>("/api/brands")
  const blog = useApiResource<{ posts: BlogPost[] }>("/api/blog?limit=3")

  useProductUpdates(() => {
    bestSellers.retry()
    flashSale.retry()
    newArrivals.retry()
  })
  useBannerUpdates(banners.retry)
  usePromotionUpdates(flashSale.retry)
  useCategoryUpdates(categories.retry)
  useBlogUpdates(blog.retry)

  return (
    <div className="flex flex-col overflow-hidden bg-white">
      <HeroBanner banners={banners.data?.banners || []} loading={banners.loading} error={banners.error} onRetry={banners.retry} />

      <section className="border-b border-gray-100 bg-white" aria-label="Store guarantees">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-3 gap-y-5 px-4 py-6 sm:px-6 md:grid-cols-4 lg:px-8">
          {[
            { icon: Truck, title: "Fast Rwanda delivery", text: "Kigali and all 30 districts" },
            { icon: Smartphone, title: "MTN MoMo & Airtel", text: "Simple local payments" },
            { icon: ShieldCheck, title: "100% authentic", text: "Genuine beauty products" },
            { icon: Sparkles, title: "Beauty expertise", text: "Made for your routine" },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-2.5 sm:gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#B76E79]/10 text-[#B76E79] sm:h-10 sm:w-10"><Icon className="h-4 w-4 sm:h-5 sm:w-5" /></span>
              <span><span className="block text-xs font-bold text-[#1a1a1a] sm:text-sm">{title}</span><span className="mt-0.5 block text-[10px] leading-4 text-gray-500 sm:text-xs">{text}</span></span>
            </div>
          ))}
        </div>
      </section>

      <CategoryGrid categories={categories.data?.categories || []} loading={categories.loading} error={categories.error} onRetry={categories.retry} />

      <ProductSection title="Rwanda's best sellers" subtitle="The products customers return for—top-rated skincare, makeup and haircare." badge="★ Community favourites" products={bestSellers.data?.products || []} loading={bestSellers.loading} error={bestSellers.error} onRetry={bestSellers.retry} onViewAll={() => goCatalog(null)} />

      <FlashSale products={flashSale.data?.products || []} loading={flashSale.loading} error={flashSale.error} onRetry={flashSale.retry} />

      <ProductSection title="Just arrived" subtitle="Fresh formulas, trending shades and new beauty discoveries now available in Rwanda." badge="New this week" products={newArrivals.data?.products || []} loading={newArrivals.loading} error={newArrivals.error} onRetry={newArrivals.retry} onViewAll={() => goCatalog(null)} tone="soft" />

      <section className="bg-white">
        {brands.loading ? (
          <SectionSkeleton titleWidth="w-40" cardCount={5} />
        ) : brands.error ? (
          <SectionFailure title="Our brand partners could not be loaded." onRetry={brands.retry} />
        ) : brands.data?.brands.length ? (
          <BrandCarousel brands={brands.data.brands} />
        ) : (
          <SectionEmpty message="New beauty brands are joining our collection soon." />
        )}
      </section>

      <WholesaleBanner />
      <ReviewsSection />

      <section className="bg-white">
        {blog.loading ? (
          <SectionSkeleton titleWidth="w-56" cardCount={3} />
        ) : blog.error ? (
          <SectionFailure title="Beauty stories could not be loaded." onRetry={blog.retry} />
        ) : blog.data?.posts.length ? (
          <BeautyTips posts={blog.data.posts} />
        ) : (
          <SectionEmpty message="Fresh beauty guides are being prepared." />
        )}
      </section>
    </div>
  )
}

function SectionSkeleton({ titleWidth, cardCount }: { titleWidth: string; cardCount: number }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className={`mb-7 h-8 animate-pulse rounded-lg bg-gray-100 ${titleWidth}`} />
      <div className={`grid gap-4 ${cardCount === 3 ? "md:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"}`}>
        {Array.from({ length: cardCount }).map((_, index) => <div key={index} className="h-52 animate-pulse rounded-2xl bg-gray-100" />)}
      </div>
    </div>
  )
}

function SectionFailure({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-dashed border-rose-200 bg-rose-50/40 px-5 py-10 text-center">
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        <button type="button" onClick={onRetry} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1a1a1a] px-4 py-2 text-xs font-bold text-white"><RefreshCw className="h-3.5 w-3.5" />Try again</button>
      </div>
    </div>
  )
}

function SectionEmpty({ message }: { message: string }) {
  return <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"><div className="rounded-3xl border border-dashed border-gray-200 bg-[#f8f9fa] px-5 py-10 text-center text-sm text-gray-500">{message}</div></div>
}

export default function Home() {
  const { view, activeProductSlug, lastOrderId, fetchUser } = useStore()

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  useRealtimeEvents()

  return (
    <>
      {view === "home" && <Homepage />}
      {view === "catalog" && <CatalogView />}
      {view === "product" && activeProductSlug && <ProductDetailView slug={activeProductSlug} />}
      {view === "cart" && <CartView />}
      {view === "checkout" && <CheckoutView />}
      {view === "confirmation" && lastOrderId && <ConfirmationView orderId={lastOrderId} />}
      {view === "trackOrder" && <TrackOrderView />}
      {view === "wholesale" && <WholesaleView />}
      {view === "admin" && <ErrorBoundary><AdminView /></ErrorBoundary>}
      {view === "login" && <LoginView />}
      {view === "register" && <RegisterView />}
      {view === "account" && <AccountView />}
      <CartDrawer />
    </>
  )
}
