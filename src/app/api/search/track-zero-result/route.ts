export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/permissions'
import { normalizeSearchQuery, normalizeSearchSession, recordSearch } from '@/server/services/search-analytics'

const BodySchema = z.object({
  query: z.string().trim().min(2).max(200),
  sessionId: z.string().trim().max(128).optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const parsed = BodySchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid search query' }, { status: 400 })
    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    const key = normalizeSearchSession(parsed.data.sessionId) || forwarded || 'anonymous'
    const limit = rateLimit(`search-zero:${key}`, { maxActions: 30, windowMs: 60_000 })
    if (!limit.allowed) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 })

    await recordSearch({
      request,
      query: normalizeSearchQuery(parsed.data.query),
      resultCount: 0,
      sessionId: parsed.data.sessionId,
      filters: { source: 'zero-result-client' },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Zero-result search tracking failed:', error)
    // Analytics must not interrupt the customer search experience.
    return NextResponse.json({ success: true })
  }
}
