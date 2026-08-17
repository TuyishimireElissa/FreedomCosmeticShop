import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Phase 5 — search history for signed-in shoppers.
 *
 * The risk here is not a broken feature, it is a privacy leak: one account
 * reading or deleting another's searches. Most of these assertions exist for
 * that, not for the happy path.
 */
const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

const rawRoute = read('src/app/api/user/search-history/route.ts')
const route = rawRoute.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const rawItemRoute = read('src/app/api/user/search-history/[id]/route.ts')
const itemRoute = rawItemRoute.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const overlay = read('src/components/storefront/SearchOverlay.tsx')
const schema = read('prisma/schema.prisma')
const migration = read('prisma/manual-migrations/20260815_user_search_history.sql')

describe('one account can never reach another account rows', () => {
  it('scopes every handler to the session user, never a client-supplied id', () => {
    // requireAuth() reads the httpOnly cookie. A userId in the body or query
    // would be forgeable.
    const handlers = route.match(/export async function (GET|POST|DELETE)/g) || []
    expect(handlers).toHaveLength(3)
    const authChecks = route.match(/await requireAuth\(\)/g) || []
    expect(authChecks, 'every handler must authenticate').toHaveLength(3)
    expect(route).not.toMatch(/body\.userId|params\.userId|searchParams\.get\('userId'\)/)
  })

  it('refuses signed-out callers with 401', () => {
    expect(route).toContain('if (!user) return unauthorized()')
    expect(route).toContain('status: 401')
    expect(itemRoute).toContain('status: 401')
  })

  it('scopes every query in the file by userId', () => {
    // Per call, not a total. `where: { userId: user.id }` appears twice in this
    // file, so asserting mere presence let a mutation strip it from GET while
    // the DELETE copy satisfied the check. A raw count is also wrong: upsert
    // legitimately carries the clause twice (the compound key and `create`).
    // So slice each Prisma call and require the clause inside it.
    const calls = [...route.matchAll(/prisma\.userSearchHistory\.\w+\(/g)]
    expect(calls.length, 'expected findMany, upsert, findMany, deleteMany x2').toBe(5)

    for (const call of calls) {
      // The argument object ends at the next statement; 400 chars covers every
      // call here and never reaches the following one.
      const body = route.slice(call.index!, call.index! + 400)
      expect(body, `unscoped query: ${body.slice(0, 60)}`).toContain('userId: user.id')
    }

    // And the id must never come from the request.
    expect(route).not.toMatch(/userId:\s*\(await request\.json\(\)\)/)
    expect(route).not.toMatch(/userId:\s*(body|params|searchParams)/)
  })

  it('enforces ownership inside the delete predicate, not after a lookup', () => {
    // deleteMany({ where: { id, userId } }) cannot touch another account's row
    // even with a correctly guessed id. A findUnique-then-compare is two round
    // trips and one forgotten early-return away from a cross-account delete.
    expect(itemRoute).toContain('where: { id, userId: user.id }')
    expect(itemRoute).not.toContain('findUnique')
  })

  it('does not confirm that an id belongs to somebody else', () => {
    // 404 rather than 403 on a miss.
    expect(itemRoute).toContain('status: 404')
    expect(itemRoute).not.toContain('status: 403')
  })

  it('never lets a CDN cache personal data, including the refusal', () => {
    // Counted, not sampled: the 200 path and the 401 path each need it. A
    // cached 401 would keep being served to a device after the shopper signs
    // in, so their history would silently never appear.
    const headers = route.match(/'Cache-Control', 'private, no-store'/g) || []
    expect(headers.length, 'both the success and the 401 path').toBe(2)
    expect(itemRoute).toContain("'Cache-Control', 'private, no-store'")
  })
})

describe('the route file obeys the Next.js export contract', () => {
  it('exports only route handlers', () => {
    // Next rejects any non-handler export with
    // `"X" is not a valid Route export field`. `tsc --noEmit` passes anyway,
    // so only `npm run build` catches it — which is exactly how this shipped
    // broken once. Both route files are checked.
    const ALLOWED = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'dynamic', 'revalidate', 'runtime', 'fetchCache', 'preferredRegion', 'maxDuration', 'generateStaticParams'])
    for (const [label, source] of [['route.ts', route], ['[id]/route.ts', itemRoute]] as const) {
      const exported = [...source.matchAll(/export\s+(?:async\s+)?(?:function|const|let|var)\s+(\w+)/g)].map((m) => m[1])
      const invalid = exported.filter((name) => !ALLOWED.has(name))
      expect(invalid, `${label} exports non-handler fields: ${invalid.join(', ')}`).toEqual([])
    }
  })
})

describe('the stored data is bounded', () => {
  it('caps the query length at the API boundary', () => {
    expect(route).toMatch(/MAX_QUERY_LENGTH = 100/)
    expect(route).toContain('max(MAX_QUERY_LENGTH)')
  })

  it('validates input with zod rather than trusting the body', () => {
    expect(route).toContain('SaveSchema.safeParse')
    expect(route).toContain('status: 400')
  })

  it('keeps only the newest ten entries', () => {
    expect(route).toMatch(/MAX_HISTORY_ITEMS = 10/)
    expect(route).toContain('take: MAX_HISTORY_ITEMS')
    expect(route).toContain('skip: MAX_HISTORY_ITEMS')
  })

  it('trims by id, not by timestamp', () => {
    // A `searchedAt < cutoff` predicate deletes every row sharing the boundary
    // second, and an upsert plus a save in the same second collide easily.
    expect(route).toContain('id: { in: stale.map((row) => row.id) }')
    expect(route).not.toMatch(/searchedAt:\s*\{\s*lt:/)
  })

  it('deduplicates instead of appending', () => {
    expect(route).toContain('upsert')
    expect(route).toContain('userId_query')
    expect(schema).toContain('@@unique([userId, query])')
  })
})

describe('the schema change is safe on a database with no migration table', () => {
  it('ships a hand-written migration', () => {
    // prisma migrate dev would read the live schema as drift and offer to
    // reset, destroying products, orders and users.
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "UserSearchHistory"')
  })

  it('is additive and re-runnable', () => {
    expect(migration).toContain('CREATE UNIQUE INDEX IF NOT EXISTS')
    expect(migration).toContain('CREATE INDEX IF NOT EXISTS')
    expect(migration).not.toMatch(/DROP\s+(TABLE|COLUMN)/i)
    expect(migration).not.toMatch(/ALTER\s+TABLE\s+"(Product|Order|User)"\s+DROP/i)
  })

  it('deletes history when the account is deleted', () => {
    expect(migration).toContain('ON DELETE CASCADE')
    expect(schema).toContain('onDelete: Cascade')
  })

  it('indexes the only read the table has', () => {
    expect(schema).toContain('@@index([userId, searchedAt(sort: Desc)])')
  })
})

describe('signed-out shoppers never touch the server', () => {
  it('gates every history request on being signed in', () => {
    const guarded = overlay.match(/if \(signedIn\)|if \(!signedIn\) return/g) || []
    expect(guarded.length, 'save, load and clear must each be gated').toBeGreaterThanOrEqual(3)
  })

  it('keeps sessionStorage working for everyone', () => {
    // It is the only store an anonymous shopper has, and it paints the list
    // instantly while the fetch is in flight.
    expect(overlay).toContain('sessionStorage.setItem(RECENT_SEARCHES_KEY')
    expect(overlay).toContain('sessionStorage.getItem(RECENT_SEARCHES_KEY')
  })

  it('reads the user from the shared store, not a prop', () => {
    expect(overlay).toContain('useStore((state) => state.user)')
  })
})

describe('history never gets in the shopper way', () => {
  it('saves fire-and-forget so a slow write cannot delay a search', () => {
    expect(overlay).toContain("void fetch('/api/user/search-history'")
    expect(overlay).toContain('.catch(() =>')
  })

  it('keeps the local list when the server call fails', () => {
    expect(overlay).toContain('if (items.length > 0) setRecent(')
  })

  it('aborts the fetch when the overlay closes', () => {
    expect(overlay).toContain('controller.abort()')
  })

  it('clears the server copy too, or the button would look broken', () => {
    expect(overlay).toMatch(/clearRecent[\s\S]{0,400}method: 'DELETE'/)
  })

  it('does not break the search when saving fails', () => {
    // POST returns success even on an internal error: the shopper already got
    // their results, and a 500 here would surface as a broken search.
    const post = route.slice(route.indexOf('export async function POST'), route.indexOf('export async function DELETE'))
    expect(post).toContain('catch')
    expect(post).toContain('success: true')
  })
})
