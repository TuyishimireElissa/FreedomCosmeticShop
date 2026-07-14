"use client"

/**
 * RecentlyViewed — horizontal scroller of recently viewed products.
 *
 * Tracks product slugs in localStorage (key: "freedom-recently-viewed").
 * Adds the current product to the list on mount.
 * Renders the most recent 8 products, excluding the current one.
 */

import { useEffect, useState } from "react"
import { Product } from "@/lib/types"
import { Skeleton } from "@/components/ui/skeleton"
import { ProductCard } from "./ProductCard"
import { Clock } from "lucide-react"
import { useT } from '@/lib/i18n/LanguageContext'

const STORAGE_KEY = "freedom-recently-viewed"
const MAX_ITEMS = 8

interface RecentlyViewedProps {
  /** Current product slug — excluded from the list */
  currentSlug: string
}

export function RecentlyViewed({ currentSlug }: RecentlyViewedProps) {
  const t = useT()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        // 1. Read existing list
        const stored = localStorage.getItem(STORAGE_KEY)
        const slugs: string[] = stored ? JSON.parse(stored) : []

        // 2. Add current slug to front (dedupe)
        const updated = [currentSlug, ...slugs.filter((s) => s !== currentSlug)].slice(
          0,
          MAX_ITEMS + 1
        )
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

        // 3. Fetch products for all slugs except current
        const otherSlugs = updated.filter((s) => s !== currentSlug)
        if (otherSlugs.length === 0) {
          if (!cancelled) setLoading(false)
          return
        }

        // Fetch each product (parallel)
        const results = await Promise.all(
          otherSlugs.map(async (slug) => {
            try {
              const res = await fetch(`/api/products/${slug}`)
              if (!res.ok) return null
              const data = await res.json()
              return data.product as Product
            } catch {
              return null
            }
          })
        )

        if (cancelled) return
        setProducts(results.filter(Boolean) as Product[])
      } catch (e) {
        console.error("RecentlyViewed error:", e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [currentSlug])

  // Don't render if no recently viewed products
  if (!loading && products.length === 0) return null

  return (
    <section className="mt-12">
      <div className="mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{t('search.recently_viewed')}</h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2 sm:gap-4">
          {products.slice(0, MAX_ITEMS).map((p) => (
            <div key={p.id} className="w-40 shrink-0 sm:w-48">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
