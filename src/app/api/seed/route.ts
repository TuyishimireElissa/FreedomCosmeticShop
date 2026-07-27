export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { shouldBlockProductionSeedRoute } from '@/lib/route-security'

/**
 * Production seeding is deliberately disabled. Database seeding must run from
 * the private deployment environment with `npx prisma db seed`, never through
 * a public HTTP endpoint.
 */
export async function POST() {
  try {
    // Defense 2: fail closed in the route even if middleware is bypassed.
    if (
      shouldBlockProductionSeedRoute('/api/seed', process.env.NODE_ENV) ||
      process.env.ALLOW_SEED !== 'true'
    ) {
      return NextResponse.json(
        { success: false, error: 'Not found' },
        { status: 404, headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
      )
    }
    await requireRole('ADMIN')
    return NextResponse.json(
      { success: false, error: 'Use the private command: npx prisma db seed' },
      { status: 410 },
    )
  } catch (error) {
    const status = error instanceof Error && 'statusCode' in error
      ? Number((error as { statusCode: number }).statusCode)
      : 500
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Seed request failed' : (error as Error).message },
      { status },
    )
  }
}

// Every method fails closed. In production middleware rejects these requests
// before this module runs; these exports provide route-level defense-in-depth.
export const GET = POST
export const PUT = POST
export const PATCH = POST
export const DELETE = POST
export const OPTIONS = POST
