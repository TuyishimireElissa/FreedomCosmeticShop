import { env, features } from '@/lib/env'
import { prisma } from '@/lib/prisma'

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

function algoliaUrl(path: string) {
  return `https://${env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${encodeURIComponent(env.ALGOLIA_INDEX_NAME)}${path}`
}

function algoliaHeaders(key: string) {
  return {
    'Content-Type': 'application/json',
    'X-Algolia-Application-Id': env.ALGOLIA_APP_ID || '',
    'X-Algolia-API-Key': key,
  }
}

export async function searchProducts(query: string, page = 1, pageSize = 24): Promise<SearchResult> {
  const safePage = Math.max(1, page)
  const safeSize = Math.min(50, Math.max(1, pageSize))
  if (features.searchIndexing && env.ALGOLIA_APP_ID && env.ALGOLIA_SEARCH_API_KEY) {
    const response = await fetch(algoliaUrl('/query'), {
      method: 'POST',
      headers: algoliaHeaders(env.ALGOLIA_SEARCH_API_KEY),
      body: JSON.stringify({ query, hitsPerPage: safeSize, page: safePage - 1 }),
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(`Search provider unavailable (${response.status})`)
    const result = await response.json() as { hits?: Array<SearchHit & { objectID?: string }>; nbHits?: number; nbPages?: number; page?: number }
    return {
      hits: (result.hits || []).map(({ objectID: _objectID, ...hit }) => hit),
      total: result.nbHits || 0,
      page: (result.page || 0) + 1,
      totalPages: result.nbPages || 0,
    }
  }

  const where = {
    isActive: true,
    isDeleted: false,
    ...(query.trim() ? { OR: [
      { name: { contains: query.trim(), mode: 'insensitive' as const } },
      { description: { contains: query.trim(), mode: 'insensitive' as const } },
      { brand: { name: { contains: query.trim(), mode: 'insensitive' as const } } },
      { category: { name: { contains: query.trim(), mode: 'insensitive' as const } } },
    ] } : {}),
  }
  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: { id: true, name: true, slug: true, price: true, images: true, brand: { select: { name: true } }, category: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (safePage - 1) * safeSize,
      take: safeSize,
    }),
    prisma.product.count({ where }),
  ])
  return {
    hits: rows.map((row) => {
      let image = ''
      try { image = JSON.parse(row.images)?.[0] || '' } catch { image = '' }
      return { id: row.id, name: row.name, slug: row.slug, price: row.price, image, brand: row.brand?.name, category: row.category.name }
    }),
    total,
    page: safePage,
    totalPages: Math.ceil(total / safeSize),
  }
}

export async function indexProduct(product: SearchHit): Promise<void> {
  if (!features.searchIndexing) return
  if (!env.ALGOLIA_APP_ID || !env.ALGOLIA_ADMIN_API_KEY) throw new Error('Search indexing is enabled but Algolia admin credentials are missing')
  const response = await fetch(algoliaUrl(`/${encodeURIComponent(product.id)}`), {
    method: 'PUT',
    headers: algoliaHeaders(env.ALGOLIA_ADMIN_API_KEY),
    body: JSON.stringify({ ...product, objectID: product.id }),
  })
  if (!response.ok) throw new Error(`Product indexing failed (${response.status})`)
}

export async function unindexProduct(productId: string): Promise<void> {
  if (!features.searchIndexing) return
  if (!env.ALGOLIA_APP_ID || !env.ALGOLIA_ADMIN_API_KEY) throw new Error('Search indexing is enabled but Algolia admin credentials are missing')
  const response = await fetch(algoliaUrl(`/${encodeURIComponent(productId)}`), {
    method: 'DELETE',
    headers: algoliaHeaders(env.ALGOLIA_ADMIN_API_KEY),
  })
  if (!response.ok) throw new Error(`Product unindex failed (${response.status})`)
}
