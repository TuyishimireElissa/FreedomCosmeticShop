export const dynamic = 'force-dynamic'

/**
 * /api/user/search-history — a signed-in shopper's own recent searches.
 *
 * GET    list, newest first
 * POST   save one (upsert: re-searching bumps the timestamp, never duplicates)
 * DELETE clear all
 *
 * PRIVACY. Every handler is scoped to `user.id` from the session cookie, never
 * to an id supplied by the caller, so one account cannot read or delete
 * another's rows even by guessing. Signed-out requests get 401 and are never
 * written — an anonymous shopper's recents stay in sessionStorage.
 *
 * This stores readable text, unlike SearchLog which HMAC-hashes everything.
 * That is deliberate: SearchLog is anonymous analytics where the text must be
 * unrecoverable, this is the shopper's own list and a hash would make it
 * useless. Consistent with Wishlist and Order, which already key on userId.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

/** Keep the list short enough to scan on a phone. */
export const MAX_HISTORY_ITEMS = 10
/** Long enough for a real phrase, short enough to bound the column. */
export const MAX_QUERY_LENGTH = 100

const SaveSchema = z.object({
  query: z.string().trim().min(2).max(MAX_QUERY_LENGTH),
})

function unauthorized() {
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
}

export async function GET() {
  try {
    const user = await requireAuth()
    if (!user) return unauthorized()

    const items = await prisma.userSearchHistory.findMany({
      where: { userId: user.id },
      select: { id: true, query: true, searchedAt: true },
      orderBy: { searchedAt: 'desc' },
      take: MAX_HISTORY_ITEMS,
    })

    const response = NextResponse.json({ success: true, data: items })
    // Personal data: never cached by a CDN or a shared proxy.
    response.headers.set('Cache-Control', 'private, no-store')
    return response
  } catch (error) {
    console.error('Search history GET failed:', error)
    return NextResponse.json({ success: false, error: 'Failed to load history' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    if (!user) return unauthorized()

    const parsed = SaveSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid query' }, { status: 400 })
    }
    const query = parsed.data.query

    // The @@unique([userId, query]) index makes this one statement: searching
    // the same phrase again moves it to the top instead of adding a duplicate.
    await prisma.userSearchHistory.upsert({
      where: { userId_query: { userId: user.id, query } },
      update: { searchedAt: new Date() },
      create: { userId: user.id, query },
    })

    /**
     * Trim to the newest MAX_HISTORY_ITEMS.
     *
     * Deleting by id rather than by date: a `searchedAt < cutoff` predicate
     * would delete every row sharing the boundary timestamp, and an upsert
     * plus a save in the same second collide easily.
     */
    const stale = await prisma.userSearchHistory.findMany({
      where: { userId: user.id },
      select: { id: true },
      orderBy: { searchedAt: 'desc' },
      skip: MAX_HISTORY_ITEMS,
    })
    if (stale.length > 0) {
      await prisma.userSearchHistory.deleteMany({
        where: { userId: user.id, id: { in: stale.map((row) => row.id) } },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Search history POST failed:', error)
    // Saving history must never break the search the shopper just ran.
    return NextResponse.json({ success: true })
  }
}

export async function DELETE() {
  try {
    const user = await requireAuth()
    if (!user) return unauthorized()

    // Scoped to the session user, so this cannot clear anyone else's history.
    const result = await prisma.userSearchHistory.deleteMany({ where: { userId: user.id } })
    return NextResponse.json({ success: true, deleted: result.count })
  } catch (error) {
    console.error('Search history DELETE failed:', error)
    return NextResponse.json({ success: false, error: 'Failed to clear history' }, { status: 500 })
  }
}
