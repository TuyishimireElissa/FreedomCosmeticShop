export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { resolveAuthSecret } from '@/lib/auth-secret'
import { rateLimit } from '@/lib/permissions'
import {
  classifyUserAgent,
  dailyNetworkHash,
  normalizeNotFoundPath,
  sanitizeReferrer,
} from '@/lib/not-found-analytics'

const schema = z.object({
  path: z.string().min(1).max(1000),
  referrer: z.string().max(2000).optional(),
}).strict()
const headers = { 'Cache-Control': 'private, no-store, max-age=0' }

export async function POST(request: Request) {
  try {
    const requestOrigin = new URL(request.url).origin
    const origin = request.headers.get('origin')
    if (origin && origin !== requestOrigin) {
      return NextResponse.json({ success: false, error: 'INVALID_ORIGIN' }, { status: 403, headers })
    }

    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'INVALID_EVENT' }, { status: 400, headers })
    }
    const path = normalizeNotFoundPath(parsed.data.path)
    if (!path) return NextResponse.json({ success: false, error: 'INVALID_PATH' }, { status: 400, headers })

    const secret = resolveAuthSecret(process.env.NEXTAUTH_SECRET, process.env.JWT_SECRET, process.env.NODE_ENV)
    const ipHash = dailyNetworkHash(
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      secret,
    )
    const limit = rateLimit(`not-found:${ipHash || 'unknown'}`, { maxActions: 30, windowMs: 60_000 })
    if (!limit.allowed) {
      return NextResponse.json({ success: false, error: 'RATE_LIMITED' }, { status: 429, headers })
    }

    await prisma.notFoundLog.create({
      data: {
        path,
        referrer: sanitizeReferrer(parsed.data.referrer),
        userAgent: classifyUserAgent(request.headers.get('user-agent')),
        ipHash,
      },
    })

    return NextResponse.json({ success: true }, { status: 202, headers })
  } catch (error) {
    console.error('404 analytics write failed:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ success: false, error: 'ANALYTICS_UNAVAILABLE' }, { status: 503, headers })
  }
}
