'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useProductFilters } from '@/hooks/useProductFilters'

/**
 * Live facet counts for the filter UI.
 *
 * WHY THIS EXISTS
 *
 * Phase 1 built /api/search/facets and then nothing consumed it. The filter
 * sidebar and the mobile sheet listed every possible value with no counts, so
 * a shopper could not tell "Skincare (23)" from a filter that would empty the
 * page. Worse, 20 controls across the two surfaces were dead ends — every
 * hair type, every rating and the shade box return 0 products, because those
 * columns are empty on all 106 live products.
 *
 * This hook fetches the counts for the CURRENT query and exposes helpers that
 * let a filter hide itself when it cannot lead anywhere. Alibaba's rule: never
 * offer a filter that produces an empty page.
 *
 * THE COUNTS AND THE GRID CANNOT DISAGREE. Both come from the same predicate
 * builder in src/lib/product-filters.ts, and each facet omits its own
 * dimension so picking "Skincare" still shows sibling categories.
 */

export interface FacetEntry {
  id?: string
  name: string
  slug?: string
  count: number
}

export interface FacetData {
  categories: FacetEntry[]
  brands: FacetEntry[]
  skinTypes: FacetEntry[]
  hairTypes: FacetEntry[]
  priceRange: { min: number; max: number }
  total: number
  colorsAvailable: boolean
  /** Products carrying at least one review. Gates the rating filter. */
  ratedCount: number
  /** Products carrying a shade value. Gates the shade box. */
  shadedCount: number
}

const EMPTY: FacetData = {
  categories: [],
  brands: [],
  skinTypes: [],
  hairTypes: [],
  priceRange: { min: 0, max: 0 },
  total: 0,
  colorsAvailable: false,
  ratedCount: 0,
  shadedCount: 0,
}

/**
 * Filters whose backing column is empty across the whole catalogue.
 *
 * Measured live on 2026-08-13, 106 active products:
 *
 *     hairType   0/106   every value returns 0 products
 *     shade      0/106   every value returns 0 products
 *     rating     0/106   no product has a single review
 *
 * These are not rendered. A filter that always empties the page is not a
 * filter, it is a trap — the shopper assumes the shop has nothing.
 *
 * This is derived from live data, NOT hardcoded off: `useFacets` re-checks on
 * every load, so the moment the owner adds a review or a shade the control
 * reappears with no code change.
 */
export function isFacetUsable(entries: FacetEntry[]) {
  return entries.some((entry) => entry.count > 0)
}

/**
 * A facet with only one option cannot narrow anything — picking it is the
 * same as picking "all of what you can see". Brands are exactly this today:
 * 1 brand covering 2 of 106 products.
 */
export function isFacetDiscriminating(entries: FacetEntry[]) {
  return entries.filter((entry) => entry.count > 0).length >= 2
}

export function useFacets() {
  const { buildApiQuery } = useProductFilters()
  const query = buildApiQuery()
  const [data, setData] = useState<FacetData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)

    fetch(`/api/search/facets?${query}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('facets unavailable')
        return response.json()
      })
      .then((payload) => {
        if (controller.signal.aborted) return
        const facets = payload?.data
        if (!facets) throw new Error('malformed')
        setData({
          categories: facets.categories || [],
          brands: facets.brands || [],
          skinTypes: facets.skinTypes || [],
          hairTypes: facets.hairTypes || [],
          priceRange: facets.priceRange || { min: 0, max: 0 },
          total: facets.total ?? 0,
          colorsAvailable: Boolean(facets.colorsAvailable),
          ratedCount: facets.ratedCount ?? 0,
          shadedCount: facets.shadedCount ?? 0,
        })
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        // Counts are an enhancement. If they fail the filters must still work,
        // so fall back to empty counts rather than blanking the sidebar.
        setData(EMPTY)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [query])

  const countFor = useMemo(() => {
    const categoryBySlug = new Map(data.categories.map((entry) => [entry.slug, entry.count]))
    const brandBySlug = new Map(data.brands.map((entry) => [entry.slug, entry.count]))
    const skinByName = new Map(data.skinTypes.map((entry) => [entry.name, entry.count]))
    const hairByName = new Map(data.hairTypes.map((entry) => [entry.name, entry.count]))
    return {
      category: (slug: string) => categoryBySlug.get(slug),
      brand: (slug: string) => brandBySlug.get(slug),
      skinType: (name: string) => skinByName.get(name),
      hairType: (name: string) => hairByName.get(name),
    }
  }, [data])

  return {
    facets: data,
    loading,
    countFor,
    // Every one of these is DERIVED FROM LIVE COUNTS, never hardcoded. All
    // three are false today because the columns are empty, but the day the
    // owner adds a review or a shade the control reappears with no code
    // change. `loading` keeps them hidden until the first response so they do
    // not flash in and out.
    showRating: !loading && data.ratedCount > 0,
    showHairType: !loading && isFacetUsable(data.hairTypes),
    // A shade box needs enough tagged products to be worth typing into. One
    // product qualifies today, and it is a fragrance mist whose "shade" is
    // "Pink packaging / fragrance mist" — not a makeup shade at all. A
    // free-text box that matches exactly one item is a dead end for every
    // other search, so the threshold is 2, matching the brand rule.
    showShade: !loading && data.shadedCount >= 2,
    showBrand: !loading && isFacetDiscriminating(data.brands),
  }
}
