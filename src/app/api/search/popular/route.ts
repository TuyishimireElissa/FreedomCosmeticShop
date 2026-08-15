export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CONTROLLED_SEARCH_VOCABULARY } from '@/lib/search-vocabulary'

/**
 * What customers actually search for, without ever storing what they typed.
 *
 * Raw search text is unrecoverable by design: `recordSearch` keeps only an
 * HMAC, because a query can contain a name, a phone number or an address.
 * That model is unchanged here. What is new is that a search matching a word
 * from our own published catalogue vocabulary also records THAT WORD — an
 * exact value from a fixed list, never customer text.
 *
 * So "12 people searched sunscreen" is answerable, and "who searched for
 * Mukamana" remains permanently unanswerable. A query matching nothing in the
 * vocabulary contributes to no count at all.
 *
 * `hasResults` is reported per term because a popular search that finds
 * nothing is the most valuable row in the table: it is a product the shop
 * could stock. 73 of 231 logged searches currently return zero.
 */

const MAX_TERMS = 20

export async function GET() {
  try {
    // One grouped read over the JSON column. `filters` is Json?, so the term is
    // extracted in SQL; Prisma cannot group by a nested JSON path.
    const rows = await prisma.$queryRaw<Array<{ term: string; searches: bigint; zero: bigint }>>`
      SELECT
        "filters"->>'term'                                  AS term,
        COUNT(*)                                            AS searches,
        COUNT(*) FILTER (WHERE "hasResults" = false)        AS zero
      FROM "SearchLog"
      WHERE "filters"->>'term' IS NOT NULL
      GROUP BY 1
      ORDER BY 2 DESC, 1 ASC
      LIMIT ${MAX_TERMS}
    `

    const known = new Set<string>(CONTROLLED_SEARCH_VOCABULARY)
    const data = rows
      // Defence in depth: only ever emit a value that is still in the
      // vocabulary, so a term removed from the list stops being reported and
      // no unexpected string can reach the response.
      .filter((row) => known.has(row.term))
      .map((row) => ({
        term: row.term,
        searches: Number(row.searches),
        zeroResultSearches: Number(row.zero),
      }))

    const response = NextResponse.json({
      success: true,
      data,
      methodology: {
        rawQueriesStored: false,
        controlledVocabularyConfigured: true,
        vocabularySize: CONTROLLED_SEARCH_VOCABULARY.length,
      },
    })
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    return response
  } catch (error) {
    console.error('Popular searches failed:', error)
    // Analytics must never break a page that embeds it. An empty list is the
    // same shape the caller already handled before this endpoint had data.
    return NextResponse.json({
      success: true,
      data: [],
      methodology: { rawQueriesStored: false, controlledVocabularyConfigured: true },
    })
  }
}
