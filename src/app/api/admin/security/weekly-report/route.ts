export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { ActivityLogger } from '@/lib/activity-logger'

export async function GET() {
  try {
    await requireRole('ADMIN', 'SUPER_ADMIN')
    return NextResponse.json({ success: true, data: await ActivityLogger.getWeeklySummary() })
  } catch (error) {
    const status = error instanceof Error && 'statusCode' in error ? Number((error as { statusCode: number }).statusCode) : 500
    console.error('Weekly security report error:', error)
    return NextResponse.json({ success: false, error: status === 500 ? 'Failed to generate weekly security report' : (error as Error).message }, { status })
  }
}
