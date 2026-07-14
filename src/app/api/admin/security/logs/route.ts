export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { ActivityLogger } from '@/lib/activity-logger'

export async function GET(request: Request) {
  try {
    await requireRole('ADMIN', 'SUPER_ADMIN')
    const params = new URL(request.url).searchParams
    const page = Number(params.get('page') || 1)
    const limit = Number(params.get('limit') || 50)
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
      return NextResponse.json({ success: false, error: 'Invalid pagination' }, { status: 400 })
    }
    const startValue = params.get('startDate')
    const endValue = params.get('endDate')
    const startDate = startValue ? new Date(startValue) : undefined
    const endDate = endValue ? new Date(endValue) : undefined
    if ((startDate && Number.isNaN(startDate.getTime())) || (endDate && Number.isNaN(endDate.getTime()))) {
      return NextResponse.json({ success: false, error: 'Invalid date filter' }, { status: 400 })
    }
    const statusValue = params.get('status')
    const status = statusValue === 'SUCCESS' || statusValue === 'FAILED' ? statusValue : undefined
    const data = await ActivityLogger.getLogs({
      userId: params.get('userId') || undefined,
      action: params.get('action') || undefined,
      resource: params.get('resource') || undefined,
      status,
      startDate,
      endDate,
      page,
      limit,
    })
    return NextResponse.json({ success: true, data })
  } catch (error) {
    const status = error instanceof Error && 'statusCode' in error ? Number((error as { statusCode: number }).statusCode) : 500
    console.error('Security logs API error:', error)
    return NextResponse.json({ success: false, error: status === 500 ? 'Failed to retrieve security logs' : (error as Error).message }, { status })
  }
}
