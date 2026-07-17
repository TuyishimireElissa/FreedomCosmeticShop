"use client"

import { useCallback, useEffect, useState } from "react"
import dynamic from "next/dynamic"
import type { Category } from "@/lib/types"
import type { HomeBanner } from "@/components/home/HeroBanner"
import Hero from "@/components/home/Hero"
import HomeSearch from "@/components/home/HomeSearch"
import MainCategories from "@/components/home/MainCategories"
import LazySection from '@/components/ui/LazySection'
import { useT } from '@/lib/i18n/LanguageContext'
import {
  useBannerUpdates,
  useCategoryUpdates,
  useRealtimeEvents,
} from "@/hooks/use-realtime"

const FeaturedProducts = dynamic(
  () => import('@/components/home/FeaturedProducts'),
  { ssr: false, loading: () => <ProductSectionSkeleton /> },
)
const DeliveryPromo = dynamic(
  () => import('@/components/home/DeliveryPromo'),
  { loading: () => <div className="mx-4 h-64 animate-pulse rounded-2xl bg-gray-100 motion-reduce:animate-none" /> },
)
const TrustSection = dynamic(
  () => import('@/components/home/TrustSection'),
  { loading: () => null },
)
const ReviewsSection = dynamic(
  () => import('@/components/home/ReviewsSection').then((module) => module.ReviewsSection),
  { loading: () => null },
)
const QuizBanner = dynamic(
  () => import('@/components/home/QuizBanner'),
  { loading: () => null },
)
const WhatsAppCTA = dynamic(
  () => import('@/components/home/WhatsAppCTA'),
  { loading: () => null },
)

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
  const banners = useApiResource<{ banners: HomeBanner[] }>("/api/banners?placement=HOME_HERO")
  const categories = useApiResource<{ categories: Category[] }>("/api/categories")

  useBannerUpdates(banners.retry)
  useCategoryUpdates(categories.retry)

  return (
    <div className="flex flex-col overflow-hidden bg-white">
      {/* 1. Hero — immediate */}
      <Hero banners={banners.data?.banners || []} loading={banners.loading} error={banners.error} />

      {/* 2. Search — immediate */}
      <HomeSearch />

      {/* 3. Three real database categories — immediate */}
      <MainCategories categories={categories.data?.categories || []} loading={categories.loading} error={categories.error} />

      {/* 4. Four real featured products — lazy */}
      <FeaturedProducts type="featured" limit={4} />

      {/* 5. Real delivery settings and active coupon only — lazy */}
      <DeliveryPromo />

      {/* 6. Four real new arrivals — lazy */}
      <FeaturedProducts type="new-arrivals" limit={4} />

      {/* 7. Configured trust information only — lazy */}
      <TrustSection />

      {/* 8. Hidden unless at least three real approved reviews exist — explicit in low-data mode */}
      <LazySection label={t('home.section_reviews')}>
        <ReviewsSection />
      </LazySection>

      {/* 9. Optional recommendation entry point — no product claims */}
      <QuizBanner />

      {/* 10. Hidden until a real WhatsApp number is configured — lazy */}
      <WhatsAppCTA />

      {/* 11. Footer is connected through SiteChrome */}
    </div>
  )
}

function ProductSectionSkeleton() {
  return (
    <div className="py-6 md:py-12">
      <div className="scrollbar-hide flex gap-3 overflow-hidden px-4 md:hidden">
        {[1, 2, 3].map((item) => <div key={item} className="h-64 w-40 flex-none animate-pulse rounded-xl bg-gray-100 motion-reduce:animate-none" />)}
      </div>
      <div className="mx-auto hidden max-w-7xl grid-cols-4 gap-4 px-6 md:grid lg:px-8">
        {[1, 2, 3, 4].map((item) => <div key={item} className="h-72 animate-pulse rounded-xl bg-gray-100 motion-reduce:animate-none" />)}
      </div>
    </div>
  )
}

export default function Home() {
  useRealtimeEvents()
  return <Homepage />
}
