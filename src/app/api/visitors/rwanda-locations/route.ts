export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/visitors/rwanda-locations?district=&sector=
 *
 * Serves one level of the Rwandan administrative hierarchy at a time so the
 * optional location form can cascade without shipping the 362 KB dataset to
 * every storefront visitor.
 *
 *   no params        -> provinces and their districts
 *   ?district=Gasabo -> sectors in that district
 *   ?district&sector -> cells in that sector
 *   ?district&sector&cell -> villages in that cell
 */
import { NextResponse } from 'next/server'
import {
  getCellsForSector,
  getSectorsForDistrict,
  getVillagesForCell,
  RWANDA_DISTRICTS,
} from '@/lib/rwanda-locations'

const cacheHeaders = { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' }

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const district = params.get('district')?.trim() || ''
  const sector = params.get('sector')?.trim() || ''
  const cell = params.get('cell')?.trim() || ''

  if (!district) {
    return NextResponse.json({ provinces: RWANDA_DISTRICTS }, { headers: cacheHeaders })
  }
  if (!sector) {
    return NextResponse.json({ sectors: getSectorsForDistrict(district) }, { headers: cacheHeaders })
  }
  if (!cell) {
    return NextResponse.json({ cells: getCellsForSector(district, sector) }, { headers: cacheHeaders })
  }
  return NextResponse.json({ villages: getVillagesForCell(district, sector, cell) }, { headers: cacheHeaders })
}
