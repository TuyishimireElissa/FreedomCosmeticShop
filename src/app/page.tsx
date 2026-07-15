"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { RefreshCw, ShieldCheck, Sparkles, Smartphone, Truck } from "lucide-react"
import type { Category, Product } from "@/lib/types"
import { HeroBanner, type HomeBanner } from "@/components/home/HeroBanner"
import { CategoryGrid } from "@/components/home/CategoryGrid"

const ProductSection = dynamic(
  () => import('@/components/home/ProductSection').then((module) => module.ProductSection),
  { ssr: false, loading: () => <ProductSectionSkeleton /> },
)
const FlashSale = dynamic(
  () => import('@/components/home/FlashSale').then((module) => module.FlashSale),
  { loading: () => <div className="mx-4 h-64 animate-pulse rounded-xl bg-gray-100" /> },
)
const BrandCarousel = dynamic(
  () => import('@/components/home/BrandCarousel').then((module) => module.BrandCarousel),
  { loading: () => null },
)
const WholesaleBanner = dynamic(
  () => import('@/components/home/WholesaleBanner').then((module) => module.WholesaleBanner),
  { loading: () => null },
)
const ReviewsSection = dynamic(
  () => import('@/components/home/ReviewsSection').then((module) => module.ReviewsSection),
  { loading: () => null },
)
const BeautyTips = dynamic(
  () => import('@/components/home/BeautyTips').then((module) => module.BeautyTips),
  { loading: () => null },
)
import {
  useBannerUpdates,
  useBlogUpdates,
  useCategoryUpdates,
  useProductUpdates,
  usePromotionUpdates,
  useRealtimeEvents,
} from "@/hooks/use-realtime"
import { useT } from '@/lib/i18n/LanguageContext'

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
  const t = useT()
  const router = useRouter()
  const banners = useApiResource<{ banners: HomeBanner[] }>("/api/banners?placement=HOME_HERO")
  const categories = useApiResource<{ categories: Category[] }>("/api/categories")
  const bestSellers = useApiResource<{ products: Product[] }>("/api/products?featured=true&sort=newest&pageSize=8&inStock=true")
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

      <section className="border-b border-gray-100 bg-white" aria-label={t('home.store_guarantees')}>
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-3 gap-y-5 px-4 py-6 sm:px-6 md:grid-cols-4 lg:px-8">
          {[
            { icon: Truck, title: t('home.fast_rwanda_delivery'), text: t('home.kigali_all_districts') },
            { icon: Smartphone, title: t('home.momo_airtel'), text: t('home.simple_local_payments') },
            { icon: ShieldCheck, title: t('home.authentic_percent'), text: t('home.genuine_beauty_products') },
            { icon: Sparkles, title: t('home.beauty_expertise'), text: t('home.made_for_routine') },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-2.5 sm:gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#B76E79]/10 text-[#B76E79] sm:h-10 sm:w-10"><Icon className="h-4 w-4 sm:h-5 sm:w-5" /></span>
              <span><span className="block text-xs font-bold text-[#1a1a1a] sm:text-sm">{title}</span><span className="mt-0.5 block text-[10px] leading-4 text-gray-500 sm:text-xs">{text}</span></span>
            </div>
          ))}
        </div>
      </section>

      <CategoryGrid categories={categories.data?.categories || []} loading={categories.loading} error={categories.error} onRetry={categories.retry} />

      <ProductSection title={t('home.featured_essentials')} subtitle={t('home.featured_subtitle')} badge={t('home.freedom_favourites')} products={bestSellers.data?.products || []} loading={bestSellers.loading} error={bestSellers.error} onRetry={bestSellers.retry} onViewAll={() => router.push("/products")} />

      <FlashSale products={flashSale.data?.products || []} loading={flashSale.loading} error={flashSale.error} onRetry={flashSale.retry} />

      <ProductSection title={t('home.just_arrived')} subtitle={t('home.just_arrived_subtitle')} badge={t('home.new_this_week')} products={newArrivals.data?.products || []} loading={newArrivals.loading} error={newArrivals.error} onRetry={newArrivals.retry} onViewAll={() => router.push("/products")} tone="soft" />

      <section className="bg-white">
        {brands.loading ? (
          <SectionSkeleton titleWidth="w-40" cardCount={5} />
        ) : brands.error ? (
          <SectionFailure title={t('home.brands_load_failed')} onRetry={brands.retry} />
        ) : brands.data?.brands.length ? (
          <BrandCarousel brands={brands.data.brands} />
        ) : (
          <SectionEmpty message={t('home.brands_coming')} />
        )}
      </section>

      <WholesaleBanner />
      <ReviewsSection />

      <section className="bg-white">
        {blog.loading ? (
          <SectionSkeleton titleWidth="w-56" cardCount={3} />
        ) : blog.error ? (
          <SectionFailure title={t('home.stories_load_failed')} onRetry={blog.retry} />
        ) : blog.data?.posts.length ? (
          <BeautyTips posts={blog.data.posts} />
        ) : (
          <SectionEmpty message={t('home.guides_preparing')} />
        )}
      </section>
    </div>
  )
}

function ProductSectionSkeleton() {
  return (
    <div className="py-6 md:py-12">
      <div className="scrollbar-hide flex gap-3 overflow-hidden px-4 md:hidden">
        {[1, 2, 3].map((item) => <div key={item} className="h-64 w-40 flex-none animate-pulse rounded-xl bg-gray-100" />)}
      </div>
      <div className="mx-auto hidden max-w-7xl grid-cols-4 gap-4 px-6 md:grid lg:px-8">
        {[1, 2, 3, 4].map((item) => <div key={item} className="h-72 animate-pulse rounded-xl bg-gray-100" />)}
      </div>
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
  const t = useT()
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-dashed border-rose-200 bg-rose-50/40 px-5 py-10 text-center">
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        <button type="button" onClick={onRetry} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1a1a1a] px-4 py-2 text-xs font-bold text-white"><RefreshCw className="h-3.5 w-3.5" />{t('common.retry')}</button>
      </div>
    </div>
  )
}

function SectionEmpty({ message }: { message: string }) {
  return <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"><div className="rounded-3xl border border-dashed border-gray-200 bg-[#f8f9fa] px-5 py-10 text-center text-sm text-gray-500">{message}</div></div>
}

export default function Home() {
  useRealtimeEvents()
  return <Homepage />
}
