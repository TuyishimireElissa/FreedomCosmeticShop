import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi, beforeEach } from 'vitest'

/**
 * Phase 2 — `/search` redirects to the real results page.
 *
 * These tests EXECUTE the route rather than grepping it. A string assertion
 * would pass on a redirect that drops the query, and dropping the query is the
 * entire failure mode worth guarding.
 */

// permanentRedirect throws internally in Next, which would abort the test.
// Capture the target instead.
const redirectTarget = vi.fn<(url: string) => never>()
vi.mock('next/navigation', () => ({
  permanentRedirect: (url: string) => {
    redirectTarget(url)
    return undefined as never
  },
}))

const { default: SearchRedirectPage } = await import('@/app/search/page')

/** Invoke the server component the way Next would, and report where it sent us. */
async function go(params: Record<string, string | string[] | undefined>): Promise<string> {
  redirectTarget.mockClear()
  await SearchRedirectPage({ searchParams: Promise.resolve(params) })
  expect(redirectTarget, 'the route must redirect').toHaveBeenCalledTimes(1)
  return redirectTarget.mock.calls[0]![0]
}

beforeEach(() => redirectTarget.mockClear())

describe('/search sends the shopper to the real results page', () => {
  it('accepts ?q= , the convention people type and share', async () => {
    expect(await go({ q: 'soap' })).toBe('/products?search=soap')
  })

  it('accepts ?search= , what the storefront navigates with', async () => {
    expect(await go({ search: 'soap' })).toBe('/products?search=soap')
  })

  it('prefers ?q= when a link carries both', async () => {
    expect(await go({ q: 'shared', search: 'internal' })).toBe('/products?search=shared')
  })

  it('lands on the plain catalogue when there is no query', async () => {
    expect(await go({})).toBe('/products')
  })

  it('treats a whitespace-only query as no query', async () => {
    expect(await go({ q: '   ' })).toBe('/products')
  })
})

describe('it never loses the rest of the link', () => {
  it('carries filters through', async () => {
    const target = await go({ q: 'soap', category: 'soap', sort: 'price-asc' })
    expect(target).toContain('search=soap')
    expect(target).toContain('category=soap')
    expect(target).toContain('sort=price-asc')
  })

  it('keeps filters even with no search term', async () => {
    expect(await go({ category: 'fragrance' })).toBe('/products?category=fragrance')
  })

  it('does not forward q or search twice', async () => {
    const target = await go({ q: 'soap', category: 'soap' })
    expect(target).not.toContain('q=')
    // exactly one search key
    expect(target.match(/search=/g)).toHaveLength(1)
  })

  it('encodes a query that would otherwise break the URL', async () => {
    const target = await go({ q: 'shea butter & oil' })
    expect(target).toContain('search=shea+butter+%26+oil')
    expect(target).not.toContain(' ')
  })

  it('survives a repeated param instead of producing "a,b"', async () => {
    // `?q=a&q=b` arrives as an array. Joining it would search for "a,b".
    expect(await go({ q: ['soap', 'lotion'] })).toBe('/products?search=soap')
  })
})

describe('the route is a redirect, not a second results page', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/app/search/page.tsx'), 'utf8')

  it('uses a permanent redirect', () => {
    expect(source).toContain('permanentRedirect')
  })

  it('renders no UI of its own', () => {
    // A second grid would duplicate a 259 kB route and split the filter logic.
    expect(source).not.toContain('ProductGrid')
    expect(source).not.toContain('ProductsPageClient')
    expect(source).not.toMatch(/return\s*\(/)
  })

  it('stays out of the sitemap', () => {
    // A URL that only redirects has nothing to index.
    const sitemap = readFileSync(resolve(process.cwd(), 'src/app/sitemap.ts'), 'utf8')
    expect(sitemap).not.toContain('/search')
  })
})
