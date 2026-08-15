import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'
import { GET } from '@/app/search/route'

/**
 * Phase 2 — `/search` redirects to the real results page.
 *
 * These tests EXECUTE the handler and read the real HTTP response. That
 * matters: the first implementation was a `page.tsx` calling
 * `permanentRedirect()`, which passed a grep-style test suite and still served
 * **200 with an HTML body** in production, because Next streamed the redirect
 * for the client to perform instead of sending a header. Asserting on
 * `response.status` and `Location` is what catches that class of bug.
 */
const route = readFileSync(resolve(process.cwd(), 'src/app/search/route.ts'), 'utf8')

/** Call the handler the way Next would, and report the redirect it issues. */
function go(url: string): { status: number; location: string } {
  const response = GET(new NextRequest(new URL(url, 'https://shop.test')))
  const location = response.headers.get('location') || ''
  // Compare paths, not absolute URLs, so the assertions do not depend on host.
  return { status: response.status, location: location.replace('https://shop.test', '') }
}

describe('it issues a real HTTP redirect, not a client-side one', () => {
  it('responds 308, so a crawler and a shared link both follow it', () => {
    const { status } = go('/search?q=soap')
    expect(status).toBe(308)
  })

  it('sets a Location header rather than streaming HTML', () => {
    const response = GET(new NextRequest(new URL('/search?q=soap', 'https://shop.test')))
    expect(response.headers.get('location')).toBeTruthy()
    // A 308 has no body to render. If this ever becomes text/html the page
    // regressed back to the streamed-redirect failure.
    expect(response.headers.get('content-type') || '').not.toContain('text/html')
  })

  it('is a route handler, not a page component', () => {
    // Comment-stripped: the file documents WHY permanentRedirect was abandoned,
    // and that prose would otherwise satisfy the very check meant to prove it
    // is gone from the code.
    const code = route.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    expect(code).toContain('NextResponse.redirect')
    expect(code).not.toContain('permanentRedirect')
  })
})

describe('/search sends the shopper to the real results page', () => {
  it('accepts ?q= , the convention people type and share', () => {
    expect(go('/search?q=soap').location).toBe('/products?search=soap')
  })

  it('accepts ?search= , what the storefront navigates with', () => {
    expect(go('/search?search=soap').location).toBe('/products?search=soap')
  })

  it('prefers ?q= when a link carries both', () => {
    expect(go('/search?q=shared&search=internal').location).toBe('/products?search=shared')
  })

  it('lands on the plain catalogue when there is no query', () => {
    expect(go('/search').location).toBe('/products')
  })

  it('treats a whitespace-only query as no query', () => {
    expect(go('/search?q=%20%20').location).toBe('/products')
  })
})

describe('it never loses the rest of the link', () => {
  it('carries filters through', () => {
    const { location } = go('/search?q=soap&category=soap&sort=price-asc')
    expect(location).toContain('search=soap')
    expect(location).toContain('category=soap')
    expect(location).toContain('sort=price-asc')
  })

  it('keeps filters even with no search term', () => {
    expect(go('/search?category=fragrance').location).toBe('/products?category=fragrance')
  })

  it('does not forward q or search twice', () => {
    const { location } = go('/search?q=soap&category=soap')
    expect(location).not.toContain('q=soap')
    expect(location.match(/search=/g)).toHaveLength(1)
  })

  it('encodes a query that would otherwise break the URL', () => {
    const { location } = go('/search?q=shea%20butter%20%26%20oil')
    expect(location).toContain('search=shea+butter+%26+oil')
    expect(location).not.toContain(' ')
  })

  it('takes the first value of a repeated param instead of "a,b"', () => {
    // `?q=a&q=b` is a malformed link, not a two-term search.
    expect(go('/search?q=soap&q=lotion').location).toBe('/products?search=soap')
  })
})

describe('it stays a redirect, not a second results page', () => {
  it('renders no UI of its own', () => {
    expect(route).not.toContain('ProductGrid')
    expect(route).not.toContain('ProductsPageClient')
  })

  it('stays out of the sitemap', () => {
    // A URL that only redirects has nothing to index.
    const sitemap = readFileSync(resolve(process.cwd(), 'src/app/sitemap.ts'), 'utf8')
    expect(sitemap).not.toContain('/search')
  })
})
