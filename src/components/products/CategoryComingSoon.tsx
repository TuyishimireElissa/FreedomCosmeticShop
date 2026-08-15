'use client'

import Link from 'next/link'
import { MessageCircle, PackageOpen } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { getWhatsAppLink } from '@/lib/business-config'

/**
 * What a shopper sees when they open a category with nothing on the shelf.
 *
 * Until now this rendered the generic filter empty state — "No products match
 * your filters / Try removing a filter". That is wrong in tone and in fact:
 * the shopper applied no filter, they tapped a category from the menu. It
 * reads as though they made a mistake when the shop simply has no stock yet.
 *
 * TWO DIFFERENT EMPTY STATES, because the database says they are different.
 * `_count.products` counts `stock > 0`, so a category that sold out looks
 * identical to one that never had stock. Measured on 2026-08-15:
 *
 *   never stocked : mens-grooming, hair-growth, natural-organic, nail-care,
 *                   deodorant, shampoo   — 0 products, 0 orders, ever
 *   sold out      : none today
 *   had stock once: makeup — 0 live products, 6 soft-deleted rows, 2 orders
 *
 * Telling a customer "coming soon" about something they bought last month
 * would be a lie, so the `soldOut` variant says it is out of stock and offers
 * the same WhatsApp route. The distinction is passed in by the caller, which
 * is the only place that knows both counts.
 *
 * WORDING. Two briefs disagreed: "Bizaza vuba" and "Turaritegura — biraza
 * vuba!". I use **"Biraza vuba"** for the heading because the shipped Vuba
 * badge already trains the eye on that word, and `Byashize` is the phrase this
 * shop already uses for sold out (`common.sold_out`). Reusing vocabulary the
 * customer has already seen beats introducing a third phrasing.
 *
 * No launch date is claimed, and no notification sign-up is offered: SMS and
 * email are both disabled in `/api/config/features`, so a "notify me" button
 * would collect a promise nobody can keep.
 */

interface CategoryComingSoonProps {
  /** Display name, already resolved through categoryLabel(). */
  categoryName: string
  /**
   * True when the category has products that are all at zero stock, as opposed
   * to never having been stocked. Changes the message, not the layout.
   */
  soldOut?: boolean
}

export default function CategoryComingSoon({ categoryName, soldOut = false }: CategoryComingSoonProps) {
  const { language } = useLanguage()
  const rw = language === 'rw'

  // verified-rw: "Biraza vuba" = it is coming soon. "Byashize" is the phrase
  // this shop already ships for sold out (common.sold_out).
  const heading = soldOut
    ? rw ? 'Byashize by’agateganyo' : 'Out of stock right now'
    : rw ? 'Biraza vuba' : 'Coming soon'

  // verified-rw: "Ntabwo turaba dufite ... muri iki gihe" = we do not have
  // these yet at this time. "Twandikire kuri WhatsApp" = write to us on WhatsApp.
  const body = soldOut
    ? rw
      ? `Ibicuruzwa byo mu cyiciro “${categoryName}” byashize by’agateganyo. Twandikire kuri WhatsApp tukumenyeshe igihe bizagarukira.`
      : `Everything in ${categoryName} is sold out at the moment. Message us on WhatsApp and we will tell you when it is back.`
    : rw
      ? `Ntabwo turaba dufite ibicuruzwa byo mu cyiciro “${categoryName}” muri iki gihe. Twandikire kuri WhatsApp tumenye icyo ushaka.`
      : `We do not stock ${categoryName} yet. Message us on WhatsApp and tell us what you are looking for.`

  // verified-rw: "Duhamagare tuvuge iki cyiciro" — owner-specified CTA wording.
  const ctaLabel = rw ? 'Duhamagare tuvuge iki cyiciro' : 'Message us about this category'
  // verified-rw: "Reba ibicuruzwa byose" = see all products.
  const browseLabel = rw ? 'Reba ibicuruzwa byose' : 'Browse all products'

  const waMessage = rw
    ? `Muraho FreedomCosmeticShop! Nashakaga kumenya ibyerekeye icyiciro "${categoryName}".`
    : `Hello FreedomCosmeticShop! I would like to ask about the "${categoryName}" category.`
  const waHref = getWhatsAppLink(waMessage)
  // getWhatsAppLink returns a placeholder anchor when the number is unset.
  // Rendering a dead CTA is worse than rendering none.
  const waConfigured = waHref.startsWith('https://')

  return (
    <div
      className="rounded-fcs-lg border border-dashed border-fcs-border-subtle bg-fcs-surface px-5 py-14 text-center"
      data-testid="category-coming-soon"
    >
      <PackageOpen className="mx-auto h-10 w-10 text-fcs-brand" aria-hidden="true" />

      <h2 className="mt-4 font-display text-xl font-semibold text-fcs-text">{heading}</h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-fcs-text-muted">{body}</p>

      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {waConfigured ? (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 w-full max-w-xs items-center justify-center gap-2 rounded-full bg-fcs-whatsapp-pill px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-fcs-whatsapp-hover sm:w-auto"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            {ctaLabel}
          </a>
        ) : null}

        <Link
          href="/products"
          className="inline-flex min-h-11 w-full max-w-xs items-center justify-center rounded-full border-2 border-fcs-brand-strong px-5 py-2.5 text-sm font-semibold text-fcs-brand-text transition-colors hover:bg-fcs-brand-strong hover:text-white sm:w-auto"
        >
          {browseLabel}
        </Link>
      </div>
    </div>
  )
}
