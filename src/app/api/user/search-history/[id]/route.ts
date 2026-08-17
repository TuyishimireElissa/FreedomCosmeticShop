export const dynamic = 'force-dynamic'

/**
 * DELETE /api/user/search-history/:id — remove one entry.
 *
 * OWNERSHIP IS ENFORCED IN THE WHERE CLAUSE, not by reading the row first and
 * comparing. `deleteMany({ where: { id, userId } })` cannot delete another
 * account's row even if the id is guessed correctly: a non-matching userId
 * simply matches nothing. A findUnique-then-check would be two round trips and
 * one forgotten early-return away from a cross-account delete.
 *
 * A miss returns 404 rather than 403, so the endpoint never confirms that an
 * id belongs to somebody else.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })

    const result = await prisma.userSearchHistory.deleteMany({
      where: { id, userId: user.id },
    })

    if (result.count === 0) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Search history item DELETE failed:', error)
    return NextResponse.json({ success: false, error: 'Failed to remove entry' }, { status: 500 })
  }
}
