'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

/**
 * "People also searched for" — chips built from real search analytics.
 *
 * Every term comes from `/api/search/popular`, which reports only words from
 * our own published catalogue vocabulary. Raw customer text is HMAC-hashed and
 * never readable, so this cannot leak what an individual typed.
 *
 * MIN_SEARCHES IS THE POINT OF THIS COMPONENT.
 *
 * The analytics table currently holds 13 terms, and most of the counts are my
 * own verification traffic from building the endpoint — I flagged that in
 * SEARCH_GAPS_COMPLETE.md. Rendering all of them would present test noise to
 * customers as "what other people searched for", which is simply untrue.
 *
 * A term needs at least MIN_SEARCHES hits before it appears. Today that leaves
 * 3 terms, below MIN_TERMS, so the section stays hidden — correctly. It will
 * switch itself on when genuine traffic accumulates, with no code change.
 * Source-gated per rule 20: the data decides, not a flag someone must remember
 * to flip.
 *
 * Terms that found nothing are excluded too. Suggesting a search that leads to
 * an empty grid wastes a tap on a 3G connection.
 */

interface PopularTerm {
  term: string
  searches: number
  zeroResultSearches: number
}

interface RelatedSearchesProps {
  /** The active query, excluded from its own suggestions. */
  currentQuery: string
  onSelect: (term: string) => void
}

/** Below this a term is noise, not a trend. */
export const MIN_SEARCHES = 3
/** Fewer chips than this is not worth a section heading. */
export const MIN_TERMS = 3
/** More than this wraps past two rows at 360px. */
export const MAX_TERMS = 8

export default function RelatedSearches({ currentQuery, onSelect }: RelatedSearchesProps) {
  const { t } = useLanguage()
  const [terms, setTerms] = useState<string[]>([])

  const normalisedQuery = currentQuery.trim().toLowerCase()

  const load = useCallback(async (signal: AbortSignal) => {
    try {
      const response = await fetch('/api/search/popular', { signal })
      if (!response.ok) return
      const body = await response.json()
      const rows: PopularTerm[] = Array.isArray(body?.data) ? body.data : []

      setTerms(
        rows
          // Enough real traffic to mean something.
          .filter((row) => row.searches >= MIN_SEARCHES)
          // A term that finds nothing is a dead end, not a suggestion.
          .filter((row) => row.searches > row.zeroResultSearches)
          // Never suggest the search the shopper is already looking at.
          .filter((row) => row.term.toLowerCase() !== normalisedQuery)
          .map((row) => row.term)
          .slice(0, MAX_TERMS),
      )
    } catch {
      // Analytics must never break a results page. An empty list renders
      // nothing, which is the same as this component not existing.
    }
  }, [normalisedQuery])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  if (terms.length < MIN_TERMS) return null

  return (
    <section
      aria-labelledby="related-searches-heading"
      className="mt-8 border-t border-fcs-border pt-5"
      data-testid="related-searches"
    >
      <h2 id="related-searches-heading" className="mb-3 text-xs font-semibold text-fcs-text-muted">
        {t('search.related_title')}
      </h2>
      <ul className="flex flex-wrap gap-2">
        {terms.map((term) => (
          <li key={term}>
            <button
              type="button"
              onClick={() => onSelect(term)}
              className="inline-flex min-h-11 items-center rounded-fcs-md border border-fcs-brand-text bg-white px-3 text-xs font-semibold text-fcs-brand-text transition-colors hover:bg-fcs-brand-strong hover:text-white"
            >
              {term}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
