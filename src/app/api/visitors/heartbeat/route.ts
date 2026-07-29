export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/visitors/heartbeat
 *
 * Records an anonymous browsing session for the admin live-visitor dashboard.
 * Called with navigator.sendBeacon, so it must always answer quickly and must
 * never throw in a way the storefront could notice.
 *
 * No raw IP is stored. The address is used in-memory for the geo lookup only.
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/permissions'
import { resolveAuthSecret } from '@/lib/auth-secret'
import { dailyNetworkHash } from '@/lib/not-found-analytics'
import {
  classifyReferrer,
  detectBrowser,
  detectDevice,
  firstPublicIp,
  geoFromHeaders,
  lookupGeo,
  normalizeVisitorPath,
  visitorSessionHash,
} from '@/lib/visitor-tracking'

const schema = z.object({
  sessionId: z.string().min(8).max(100),
  path: z.string().max(200).optional().nullable(),
  referrer: z.string().max(500).optional().nullable(),
})

const noStore = { 'Cache-Control': 'private, no-store, max-age=0' }

export async function POST(request: Request) {
  try {
    const requestOrigin = new URL(request.url).origin
    const origin = request.headers.get('origin')
    if (origin && origin !== requestOrigin) {
      return NextResponse.json({ success: false }, { status: 403, headers: noStore })
    }

    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ success: false }, { status: 400, headers: noStore })

    const secret = resolveAuthSecret(process.env.NEXTAUTH_SECRET, process.env.JWT_SECRET, process.env.NODE_ENV)
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const networkHash = dailyNetworkHash(forwardedFor || realIp, secret)

    const limit = rateLimit(`visitor-heartbeat:${networkHash || 'unknown'}`, { maxActions: 60, windowMs: 60_000 })
    if (!limit.allowed) return NextResponse.json({ success: false }, { status: 429, headers: noStore })

    const sessionHash = visitorSessionHash(parsed.data.sessionId, secret)
    const userAgent = request.headers.get('user-agent') || ''
    const path = normalizeVisitorPath(parsed.data.path)
    const existing = await prisma.visitorSession.findUnique({
      where: { sessionHash },
      select: { id: true, country: true },
    })

    if (existing) {
      await prisma.visitorSession.update({
        where: { sessionHash },
        data: { lastSeenAt: new Date(), currentPath: path, pageViews: { increment: 1 } },
      })
      return NextResponse.json({ success: true }, { headers: noStore })
    }

    // Vercel resolves country and region at the edge for free; only fall back
    // to an outbound lookup when those headers are absent.
    const geo = geoFromHeaders(request.headers)
      ?? await lookupGeo(firstPublicIp(forwardedFor, realIp), networkHash)
    await prisma.visitorSession.create({
      data: {
        sessionHash,
        networkHash,
        country: geo.country,
        countryCode: geo.countryCode,
        ipProvince: geo.province,
        ipDistrict: geo.district,
        device: detectDevice(userAgent),
        browser: detectBrowser(userAgent),
        referrer: classifyReferrer(parsed.data.referrer),
        currentPath: path,
      },
    })
    return NextResponse.json({ success: true }, { status: 201, headers: noStore })
  } catch (error) {
    console.error('Visitor heartbeat error:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ success: false }, { status: 500, headers: noStore })
  }
}
