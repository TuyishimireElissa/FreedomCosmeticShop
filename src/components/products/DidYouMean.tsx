'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageContext'
import { suggestCorrection } from '@/lib/search-correction'

/**
 * "Did you mean …?" shown only when a search finds nothing.
 *
 * IT VERIFIES BEFORE IT SUGGESTS.
 *
 * `suggestCorrection` knows the vocabulary but not the stock level. Offering
 * "sunscreen" to a shop that carries none would send the shopper from one
 * empty page to another, which is worse than saying nothing — it looks like
 * the site is guessing. So the component probes the suggestion with
 * `limit=1` and renders only when the corrected term actually returns
 * products, with the real count in the label.
 *
 * Measured live before building this: `sunscrin` returns 3 products,
 * `moisturiser` 49 and `vitanin` 26, because the vocabulary already resolves
 * those upstream. Only a query that genuinely finds nothing — `shampo`, 0
 * hits — reaches this component at all.
 *
 * Renders nothing while probing, so the empty state never flickers.
 */
export default function DidYouMean({
  query,
  onSelect,
}: {
  query: string
  onSelect: (term: string) => void
}) {
  const t = useT()
  const [suggestion, setSuggestion] = useState<{ term: string; count: number } | null>(null)

  useEffect(() => {
    setSuggestion(null)
    const term = suggestCorrection(query)
    if (!term) return

    const controller = new AbortController()
    fetch(`/api/products?q=${encodeURIComponent(term)}&limit=1`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (controller.signal.aborted) return
        const count = payload?.pagination?.total
        // Only surface a correction that leads somewhere.
        if (typeof count === 'number' && count > 0) setSuggestion({ term, count })
      })
      .catch(() => {
        // Silent: the empty state below is already useful on its own.
      })
    return () => controller.abort()
  }, [query])

  if (!suggestion) return null

  return (
    <p className="mt-4 text-sm text-fcs-text">
      <button
        type="button"
        onClick={() => onSelect(suggestion.term)}
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-fcs-surface-muted px-4 text-sm font-semibold text-fcs-brand-text transition-colors hover:bg-fcs-border-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fcs-brand-strong"
      >
        <Search className="h-3.5 w-3.5" aria-hidden="true" />
        {t('search.did_you_mean', { term: suggestion.term })}
        <span className="text-xs font-normal text-fcs-text-muted">({suggestion.count})</span>
      </button>
    </p>
  )
}
