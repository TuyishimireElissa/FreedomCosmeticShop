import { permanentRedirect } from 'next/navigation'

/**
 * `/search` — a memorable URL that lands on the real results page.
 *
 * WHY A REDIRECT AND NOT A PAGE. `/products` already *is* the search results
 * page: it owns the filter sidebar, the facet counts, the grid, pagination,
 * "did you mean", and now the WhatsApp sourcing panel. Building a second
 * results page would duplicate a 259 kB route, split the filter logic across
 * two places, and put the shared-JS budget at risk for no functional gain.
 * A redirect costs one hop and keeps exactly one implementation.
 *
 * BOTH QUERY PARAMS ARE ACCEPTED, because both are genuinely in use:
 *   ?q=      DidYouMean (DidYouMean.tsx:43), SearchWithSuggestions:179,
 *            /api/search/suggestions, and the convention people type by hand
 *   ?search= HomeSearch:16, BottomNav:51, products/page.tsx:52 — what the
 *            storefront actually navigates with
 * `?q=` wins if somehow both are present, since a hand-typed or shared link
 * is the more deliberate signal.
 *
 * EVERY OTHER PARAM IS PRESERVED. A link like
 * `/search?q=soap&category=soap&sort=price-asc` must not silently lose its
 * filters on the way through.
 *
 * 308, not 307. The mapping is permanent and identical for every visitor, so
 * a search engine that follows it should consolidate on /products rather than
 * keep re-checking. `permanentRedirect` preserves the request method, unlike
 * a plain 301.
 *
 * Deliberately NOT in sitemap.ts: a URL that only redirects has nothing to
 * index, and /products is already listed at priority 0.9.
 */

type SearchPageParams = Promise<Record<string, string | string[] | undefined>>

/** First value only: `?q=a&q=b` is a malformed link, not a two-term search. */
function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

export default async function SearchRedirectPage({ searchParams }: { searchParams: SearchPageParams }) {
  const params = await searchParams

  const query = (firstValue(params.q) || firstValue(params.search)).trim()

  const forwarded = new URLSearchParams()
  if (query) forwarded.set('search', query)

  // Carry every other filter through untouched. `q` and `search` are dropped
  // because they have already been folded into the single `search` key above.
  for (const [key, value] of Object.entries(params)) {
    if (key === 'q' || key === 'search') continue
    const single = firstValue(value)
    if (single) forwarded.set(key, single)
  }

  const queryString = forwarded.toString()
  permanentRedirect(queryString ? `/products?${queryString}` : '/products')
}
