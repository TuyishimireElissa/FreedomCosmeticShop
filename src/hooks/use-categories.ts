'use client'

import { useEffect, useState } from 'react'

/**
 * Live category list for the storefront chrome.
 *
 * Navbar and Footer each hardcoded their own array, so neither could reflect
 * the database. Both linked to Makeup while the homepage grid hid it —
 * verified live, the navbar link led to "No products match your filters".
 *
 * One hook, one request, shared shape. Kept deliberately small: no cache
 * library, no new dependency. `/api/categories` already sets
 * `s-maxage=60, stale-while-revalidate=300`, so the CDN absorbs repeat loads.
 */

export interface StorefrontCategory {
  id: string
  name: string
  nameRw?: string | null
  slug: string
  sortOrder: number
  _count?: { products: number }
}

/** Live product count, defaulting to 0 rather than undefined. */
export function liveProductCount(category: StorefrontCategory): number {
  return category._count?.products ?? 0
}

export function useCategories() {
  const [categories, setCategories] = useState<StorefrontCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/categories', { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (controller.signal.aborted) return
        const rows = payload?.categories ?? payload?.data?.categories
        if (Array.isArray(rows)) setCategories(rows)
      })
      .catch(() => {
        // Navigation must survive a failed request. An empty list renders the
        // "All products" entry alone rather than breaking the header.
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

  return { categories, loading }
}
