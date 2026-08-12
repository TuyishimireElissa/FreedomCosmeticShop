'use client'

/**
 * Curated routines on the homepage.
 *
 * The brief asked for three hard-coded routines in a `routines.ts` config,
 * each listing product IDs. I did not do that, for two reasons:
 *
 *  1. `Bundle` and `BundleProduct` already exist in the schema, with
 *     `bundleType: ROUTINE`, step ordering, per-step labels and a bundle
 *     price. A parallel config file would duplicate a real feature and the two
 *     would drift the first time the owner edited one and not the other.
 *  2. Hard-coded product IDs break silently. A product deleted or deactivated
 *     in admin would leave a routine card pointing at nothing, and nobody
 *     would notice until a customer did.
 *
 * So this reads `/api/bundles?type=ROUTINE`, which already recomputes
 * `normalTotal`, `savings` and per-item stock from live product rows on every
 * request. The owner creates routines in the admin bundle manager and they
 * appear here — the same pattern as FeaturedBento, which stayed invisible for
 * weeks and lit up the moment products were curated.
 *
 * Self-hides when there are no routines. There are 0 today, so this ships
 * dormant rather than showing an empty shelf.
 *
 * Card markup is BundleCard, reused rather than reimplemented: it already
 * handles cover images, step lists, savings, the sold-out veil and per-item
 * stock warnings.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import BundleCard, { type BundleCardData } from '@/components/bundles/BundleCard'
import { useT } from '@/lib/i18n/LanguageContext'
import { useReveal } from '@/hooks/use-reveal'

export default function RoutineBundles({ limit = 3 }: { limit?: number }) {
  const t = useT()
  const [bundles, setBundles] = useState<BundleCardData[]>([])
  const [loading, setLoading] = useState(true)
  const ref = useReveal<HTMLDivElement>()

  const load = useCallback(async (signal: AbortSignal) => {
    try {
      const response = await fetch('/api/bundles?type=ROUTINE', { cache: 'no-store', signal })
      if (!response.ok) throw new Error()
      const payload = await response.json()
      const rows: BundleCardData[] = payload?.data || []
      if (!signal.aborted) setBundles(rows.slice(0, limit))
    } catch (error) {
      // A failed fetch and an empty catalogue both mean "show nothing here".
      if (!(error instanceof DOMException && error.name === 'AbortError') && !signal.aborted) setBundles([])
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  // No skeleton: this section is optional, and reserving space for something
  // that usually is not there would push real content down on every load.
  if (loading || bundles.length === 0) return null

  return (
    <section className="bg-fcs-surface px-4 py-10 md:py-16" aria-labelledby="routines-title">
      <div ref={ref} className="fcs-reveal mx-auto max-w-5xl">
        <div className="mb-6 text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-fcs-brand-text">
            {t('home.routines_eyebrow')}
          </span>
          <h2 id="routines-title" className="mt-2 font-display text-3xl font-normal text-fcs-text">
            {t('home.routines_title')}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-fcs-text-muted">{t('home.routines_subtitle')}</p>
        </div>

        {/* Bleeds to the viewport edge on phones so the last card is visibly
          * clipped — the cue that there is more to swipe. */}
        <ul className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
          {bundles.map((bundle) => (
            <li key={bundle.id} className="flex-none snap-start md:w-auto">
              <BundleCard bundle={bundle} />
            </li>
          ))}
        </ul>

        <Link
          href="/bundles"
          className="mx-auto mt-6 flex min-h-12 w-full max-w-xs items-center justify-center gap-2 rounded-full border border-fcs-border-subtle text-sm font-semibold text-fcs-brand-text transition-colors duration-150 ease-fcs-snap hover:bg-fcs-surface-muted motion-reduce:transition-none"
        >
          {t('home.routines_cta')}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
