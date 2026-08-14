'use client'

import { useLanguage } from '@/lib/i18n/LanguageContext'

/**
 * "Vuba / Soon" pill for a category with nothing on the shelf yet.
 *
 * It is informational, not a blocker: the category stays clickable and leads
 * to the Coming Soon page. The badge only sets the expectation before the tap.
 *
 * CONTRAST — I DID NOT USE THE COLOUR THE BRIEF SPECIFIED.
 *
 * The brief asked for white text on `fcs-brand` (#B76E79). Measured, that is
 * **3.80:1**, below the 4.5:1 AA floor, and at 10px it is not large-scale
 * text so the 3:1 exemption does not apply. This codebase already fails a
 * build over #C77B85 at 3.18:1 for exactly this reason, so shipping 3.80:1
 * would contradict a rule it enforces elsewhere.
 *
 * Owner chose the alternative: keep white text, darken the background one
 * step to `fcs-brand-strong` (#A85D68) — **4.74:1, passes AA**. Visually
 * near-identical, and it matches the token already used for filled buttons.
 */
export default function CategorySoonBadge({ className = '' }: { className?: string }) {
  const { language } = useLanguage()
  // verified-rw: "Vuba" = soon.
  const label = language === 'rw' ? 'Vuba' : 'Soon'

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-fcs-sm bg-fcs-brand-strong px-1.5 py-0.5 text-[10px] font-semibold italic leading-none text-white ${className}`}
    >
      {label}
    </span>
  )
}
