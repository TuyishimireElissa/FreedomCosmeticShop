export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/visitors/location
 *
 * Stores the precise location a visitor volunteered. Entirely optional: the
 * storefront works identically whether or not this is ever called.
 *
 * Sector, cell and village can only reach the database through this route,
 * because IP geolocation cannot resolve below district in Rwanda.
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/permissions'
import { resolveAuthSecret } from '@/lib/auth-secret'
import { dailyNetworkHash } from '@/lib/not-found-analytics'
import { isValidRwandaLocation } from '@/lib/rwanda-locations'
import { visitorSessionHash } from '@/lib/visitor-tracking'

const schema = z.object({
  sessionId: z.string().min(8).max(100),
  province: z.string().min(2).max(60),
  district: z.string().min(2).max(60),
  sector: z.string().min(1).max(60).optional().nullable(),
  cell: z.string().min(1).max(60).optional().nullable(),
  village: z.string().min(1).max(60).optional().nullable(),
})

const noStore = { 'Cache-Control': 'private, no-store, max-age=0' }

export async function POST(request: Request) {
  try {
    const requestOrigin = new URL(request.url).origin
    const origin = request.headers.get('origin')
    if (origin && origin !== requestOrigin) {
      return NextResponse.json({ success: false, error: 'INVALID_ORIGIN' }, { status: 403, headers: noStore })
    }

    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'INVALID_LOCATION' }, { status: 400, headers: noStore })
    }
    const data = parsed.data

    const secret = resolveAuthSecret(process.env.NEXTAUTH_SECRET, process.env.JWT_SECRET, process.env.NODE_ENV)
    const networkHash = dailyNetworkHash(request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'), secret)
    const limit = rateLimit(`visitor-location:${networkHash || 'unknown'}`, { maxActions: 10, windowMs: 60_000 })
    if (!limit.allowed) {
      return NextResponse.json({ success: false, error: 'RATE_LIMITED' }, { status: 429, headers: noStore })
    }

    // Every level is checked against the vendored administrative hierarchy,
    // so no free-text place name can enter the database.
    const valid = isValidRwandaLocation(
      data.province,
      data.district,
      data.sector || undefined,
      data.cell || undefined,
      data.village || undefined,
    )
    if (!valid) {
      return NextResponse.json({ success: false, error: 'UNKNOWN_LOCATION' }, { status: 400, headers: noStore })
    }

    const sessionHash = visitorSessionHash(data.sessionId, secret)
    const session = await prisma.visitorSession.findUnique({ where: { sessionHash }, select: { id: true } })
    if (!session) {
      return NextResponse.json({ success: false, error: 'NO_SESSION' }, { status: 404, headers: noStore })
    }

    const payload = {
      province: data.province,
      district: data.district,
      sector: data.sector || null,
      cell: data.cell || null,
      village: data.village || null,
    }
    await prisma.visitorLocation.upsert({
      where: { sessionId: session.id },
      create: { sessionId: session.id, ...payload },
      update: { ...payload, submittedAt: new Date() },
    })

    return NextResponse.json({ success: true }, { status: 201, headers: noStore })
  } catch (error) {
    console.error('Visitor location error:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ success: false, error: 'SAVE_FAILED' }, { status: 500, headers: noStore })
  }
}
