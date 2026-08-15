import { type NextRequest, NextResponse } from 'next/server'

/**
 * `/search` — a memorable URL that lands on the real results page.
 *
 * WHY A REDIRECT AND NOT A PAGE. `/products` already IS the search results
 * page: filter sidebar, facet counts, grid, pagination, "did you mean", and
 * the WhatsApp sourcing panel. A second results page would duplicate a 259 kB
 * route, split filter logic across two files, and put the 103 kB shared budget
 * at risk for no functional gain.
 *
 * WHY A ROUTE HANDLER AND NOT A PAGE COMPONENT. My first attempt was
 * `page.tsx` calling `permanentRedirect()`. It passed 13 unit tests and still
 * did not work in production. Measured against the standalone server Vercel
 * actually runs, `/search?q=soap` returned **200 with an HTML body**, not a
 * 308: because the component renders nothing, Next had already begun
 * streaming, so it embedded `NEXT_REDIRECT;replace;/products?search=soap;308`
 * in the payload for the *client* to act on. That works for an in-app
 * navigation and fails for everything else — a shared WhatsApp link, a crawler,
 * `curl`, or any client that does not execute React.
 *
 * A route handler returns a real HTTP response, so the 308 is a genuine
 * header. `next.config.js` `redirects()` would also work but that file is
 * protected, and this keeps the logic beside its tests.
 *
 * BOTH QUERY PARAMS ACCEPTED, because the audit found both in genuine use:
 *   ?q=      DidYouMean.tsx:43, SearchWithSuggestions.tsx:179,
 *            /api/search/suggestions, and what a person types by hand
 *   ?search= HomeSearch.tsx:16, BottomNav.tsx:51, products/page.tsx:52
 * `?q=` wins when both are present: a hand-typed or shared link is the more
 * deliberate signal.
 *
 * 308 preserves the request method and tells a crawler the move is permanent,
 * so it consolidates on /products instead of re-checking. Deliberately absent
 * from sitemap.ts — a URL that only redirects has nothing to index.
 */

export const dynamic = 'force-dynamic'

export function GET(request: NextRequest) {
  const incoming = request.nextUrl.searchParams

  // `get()` returns the FIRST value, so `?q=a&q=b` searches for "a" rather
  // than the nonsense term "a,b" that joining would produce.
  const query = (incoming.get('q') || incoming.get('search') || '').trim()

  const forwarded = new URLSearchParams()
  if (query) forwarded.set('search', query)

  // Carry every other filter through untouched, so a link like
  // /search?q=soap&category=soap&sort=price-asc keeps its filters.
  // `q` and `search` are skipped: both were folded into `search` above.
  incoming.forEach((value, key) => {
    if (key === 'q' || key === 'search') return
    if (value && !forwarded.has(key)) forwarded.set(key, value)
  })

  const queryString = forwarded.toString()
  const target = new URL(queryString ? `/products?${queryString}` : '/products', request.nextUrl.origin)
  return NextResponse.redirect(target, 308)
}
