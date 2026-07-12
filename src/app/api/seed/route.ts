export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'

/**
 * Production seeding is deliberately disabled. Database seeding must run from
 * the private deployment environment with `npx prisma db seed`, never through
 * a public HTTP endpoint.
 */
export async function POST() {
  try {
    if (process.env.NODE_ENV === 'production' || process.env.ALLOW_SEED !== 'true') {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
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
