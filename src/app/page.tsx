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
const PersonalizedRecommendations = dynamic(
  () => import('@/components/home/PersonalizedRecommendations'),
  { ssr: false, loading: () => null },
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
const HowToOrder = dynamic(
  () => import('@/components/home/HowToOrder'),
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
      {/* Narrative order: discovery -> desire -> confidence -> assistance.
       * Each section earns its place; none exists because "shops have one".
       *   Hero        editorial statement
       *   Search      intent shortcut
       *   Trust       confidence, before we ask for anything
       *   Categories  browse by department
       *   Featured    proven products
       *   Concierge   human help at the point of hesitation
       *   Delivery    transparent cost and timing
       *   New         discovery
       *   Quiz        guided discovery
       *   Reviews     social proof (self-hides until real reviews exist)
       */}
      <Hero banners={banners.data?.banners || []} loading={banners.loading} error={banners.error} />

      <HomeSearch />

      {/* Trust moved directly under the fold: a first-time buyer decides
       * whether this shop is real long before they reach the footer. */}
      <TrustSection />

      {/* WhatsApp ordering is unfamiliar to a first-time visitor. Explain it
        * immediately after trust and before asking them to browse. */}
      <HowToOrder />

      <MainCategories categories={categories.data?.categories || []} loading={categories.loading} error={categories.error} />

      <FeaturedProducts type="featured" limit={4} />

      <LazySection label={t('personalized_recommendations.section_label')}>
        <PersonalizedRecommendations />
      </LazySection>

      <DeliveryPromo />

      <FeaturedProducts type="new-arrivals" limit={4} />

      {/* QuizBanner intentionally not rendered: the beauty quiz filters on
        * `ingredients` (1 of 101 products) and `skinType` (22 of 101), so it
        * returns nothing for most answers. Restore it once product content is
        * filled in — the component and its route are untouched.
        */}

      {/* Beauty Concierge — human guidance framed as a service, not support. */}
      <WhatsAppCTA />


      <LazySection label={t('home.section_reviews')}>
        <ReviewsSection />
      </LazySection>

      {/* 12. Footer is connected through SiteChrome */}
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
