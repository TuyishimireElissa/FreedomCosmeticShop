/**
 * Search service — abstraction over Algolia / in-memory search.
 *
 * The MVP uses Prisma's `contains` filter for search, which is fine for
 * a few hundred products. For larger catalogs, sync products to Algolia
 * and use this service for fast, typo-tolerant search.
 *
 * To complete this integration:
 *   1. Sign up at https://www.algolia.com/ → get app_id, api_key
 *   2. Set ALGOLIA_* in .env
 *   3. Set ENABLE_SEARCH_INDEXING=true
 *   4. Call indexProduct() on every product create/update/delete
 */

import { env, features } from "@/lib/env"

export interface SearchHit {
  id: string
  name: string
  slug: string
  price: number
  image: string
  brand?: string
  category?: string
}

export interface SearchResult {
  hits: SearchHit[]
  total: number
  page: number
  totalPages: number
}

/**
 * Search products by query string.
 * Falls back to API search if Algolia is not configured.
 */
export async function searchProducts(
  query: string,
  page = 1,
  pageSize = 24
): Promise<SearchResult> {
  if (!features.searchIndexing || !env.ALGOLIA_APP_ID) {
    // Fallback: use the existing /api/products endpoint
    const res = await fetch(`/api/products?search=${encodeURIComponent(query)}&limit=${pageSize}`)
    const data = await res.json()
    return {
      hits: (data.products || []).map(
        (p: {
          id: string
          name: string
          slug: string
          price: number
          images: string[]
          brand?: string
          category?: { name: string }
        }) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: p.price,
          image: p.images?.[0] || "",
          brand: p.brand,
          category: p.category?.name,
        })
      ),
      total: data.count || 0,
      page,
      totalPages: Math.ceil((data.count || 0) / pageSize),
    }
  }

  // TODO: Real Algolia integration
  // const algoliasearch = (await import("algoliasearch")).default
  // const client = algoliasearch(env.ALGOLIA_APP_ID!, env.ALGOLIA_SEARCH_API_KEY!)
  // const index = client.initIndex(env.ALGOLIA_INDEX_NAME)
  // const { hits, nbHits, nbPages, page: resPage } = await index.search(query, { hitsPerPage: pageSize, page: page - 1 })

  return { hits: [], total: 0, page, totalPages: 0 }
}

/**
 * Index (or re-index) a product in Algolia.
 * Call this on product create/update/delete.
 */
export async function indexProduct(_product: SearchHit): Promise<void> {
  if (!features.searchIndexing || !env.ALGOLIA_ADMIN_API_KEY) return

  // TODO: Implement
  // const algoliasearch = (await import("algoliasearch")).default
  // const client = algoliasearch(env.ALGOLIA_APP_ID!, env.ALGOLIA_ADMIN_API_KEY!)
  // const index = client.initIndex(env.ALGOLIA_INDEX_NAME)
  // await index.saveObject(product, { autoGenerateObjectIDIfNotExist: true })
}

/**
 * Remove a product from the Algolia index.
 */
export async function unindexProduct(_productId: string): Promise<void> {
  if (!features.searchIndexing || !env.ALGOLIA_ADMIN_API_KEY) return
  // TODO: Implement
  // await index.deleteObject(productId)
}
