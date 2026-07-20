export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

/**
 * Raw search terms are intentionally unavailable because customer searches may
 * contain personal information. A future controlled-vocabulary aggregator may
 * expose canonical catalogue terms without retaining free text.
 */
export async function GET() {
  const response = NextResponse.json({
    success: true,
    data: [],
    methodology: { rawQueriesStored: false, controlledVocabularyConfigured: false },
  })
  response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
  return response
}
