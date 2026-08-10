'use client'

/**
 * Three facts a first-time Rwandan buyer needs before they trust the shop:
 * where it delivers, how they can pay, and whether the goods are genuine.
 *
 * Horizontal scroll on phones, centred row from `sm` up. Every claim here is
 * backed by something real:
 *   - districts   DeliveryZoneSettings covers all five provinces
 *   - payment     ACCEPTED_PAYMENTS, the same list the footer and schema.org use
 *   - authentic   the existing product.authentic_guarantee string
 *
 * Nothing is invented. There is deliberately no "10,000 happy customers" pill —
 * the shop has six orders and zero reviews.
 */

import { BadgeCheck, MapPin, Wallet } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageContext'

const PILLS = [
  { key: 'proof_districts', icon: MapPin },
  { key: 'proof_payment', icon: Wallet },
  { key: 'proof_authentic', icon: BadgeCheck },
] as const

export default function SocialProofBar() {
  const t = useT()

  return (
    <section
      aria-label={t('home.proof_label')}
      className="border-y border-fcs-border-subtle bg-fcs-surface-muted"
    >
      {/* Scrolls on 360px rather than wrapping into three cramped lines. */}
      <ul className="scrollbar-hide mx-auto flex max-w-5xl snap-x gap-2.5 overflow-x-auto px-4 py-3 sm:justify-center sm:gap-4 sm:overflow-visible">
        {PILLS.map(({ key, icon: Icon }) => (
          <li
            key={key}
            className="flex flex-none snap-start items-center gap-2 rounded-full border border-fcs-border-subtle bg-fcs-surface-elevated px-3.5 py-2 sm:flex-initial"
          >
            <Icon className="h-4 w-4 shrink-0 text-fcs-umber" aria-hidden="true" />
            <span className="whitespace-nowrap text-xs font-semibold text-fcs-text sm:text-sm">
              {t(`home.${key}`)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
