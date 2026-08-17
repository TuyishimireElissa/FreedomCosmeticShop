'use client'

import { useLanguage } from '@/lib/i18n/LanguageContext'
import { categoryLabel } from '@/lib/category-i18n-map'
import type { FacetEntry } from '@/hooks/use-facets'

/**
 * Pills that jump straight to the categories a search actually hit.
 *
 * A search for "isabune" returns 35 products spread across Soap (33),
 * Baby & Kids (1) and Body Care (1). The grid shows them interleaved, and the
 * filter sidebar is off-screen on a phone, so the shopper has to scroll a
 * sidebar they cannot see to discover that the split exists at all. These
 * pills surface it above the results.
 *
 * SOURCE-GATED, per rule 20. The component decides nothing about when it is
 * useful — the caller passes only the categories that the CURRENT search
 * matched, and this renders or returns null. That keeps the "is this worth
 * showing" logic in one place, next to the search state that answers it.
 *
 * THE BRIEF CONTRADICTED ITSELF on the threshold: "only show if search matches
 * multiple categories" and "only show if 3+ categories match". Two is
 * multiple. I use 3+, because with two categories the pills duplicate what the
 * grid already makes obvious, and every row costs vertical space on a 360px
 * screen.
 *
 * Counts come from /api/search/facets, which computes each facet with its own
 * dimension excluded — so "Soap 33" is the number of soaps matching this
 * search, not the number of soaps in the shop.
 */

/** A facet entry plus the Kinyarwanda name, which facets do not carry. */
export interface QuickJumpCategory extends FacetEntry {
  slug: string
  nameRw?: string | null
}

interface CategoryQuickJumpsProps {
  categories: QuickJumpCategory[]
  /** Currently active category slug, so it can render as selected. */
  activeSlug?: string
  onSelect: (slug: string) => void
}

/** Below this the pills repeat what the grid already shows. */
export const MIN_QUICK_JUMP_CATEGORIES = 3

export default function CategoryQuickJumps({ categories, activeSlug, onSelect }: CategoryQuickJumpsProps) {
  const { t, language } = useLanguage()

  const usable = categories.filter((category) => category.count > 0 && category.slug)
  if (usable.length < MIN_QUICK_JUMP_CATEGORIES) return null

  return (
    <nav
      aria-label={t('search.quick_jump_label')}
      className="mb-4 rounded-fcs-md bg-fcs-surface px-3 py-3"
      data-testid="category-quick-jumps"
    >
      <p className="mb-2 text-xs font-semibold text-fcs-text-muted">
        {t('search.quick_jump_title', { count: usable.length })}
      </p>

      {/* Horizontal scroll rather than wrap: at 360px a wrapped row of five
          pills pushes the first product below the fold. */}
      <ul className="scrollbar-hide -mx-1 flex snap-x gap-2 overflow-x-auto px-1">
        {usable.map((category) => {
          const selected = activeSlug === category.slug
          const label = categoryLabel(
            { slug: category.slug, name: category.name, nameRw: category.nameRw },
            t,
            language,
          )
          return (
            <li key={category.slug} className="shrink-0 snap-start">
              <button
                type="button"
                onClick={() => onSelect(category.slug)}
                aria-pressed={selected}
                className={[
                  'inline-flex min-h-11 items-center gap-1.5 rounded-fcs-md border px-3 text-xs font-semibold transition-colors',
                  // WCAG 1.4.11: the pill is a control whose selected state must
                  // be perceivable, so the boundary carries real contrast rather
                  // than a hairline. --fcs-border-subtle #E5D9C8 measures 1.39:1
                  // on white and would have been effectively invisible;
                  // fcs-brand-text is 5.49:1.
                  selected
                    ? 'border-fcs-brand-strong bg-fcs-brand-strong text-white'
                    : 'border-fcs-brand-text bg-white text-fcs-text hover:bg-fcs-surface',
                ].join(' ')}
              >
                <span>{label}</span>
                {/* Plain white, not white/90: at 90% opacity the count measures
                    4.23:1 on fcs-brand-strong and fails AA. */}
                <span className={selected ? 'text-white' : 'text-fcs-brand-text'}>
                  {category.count}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
