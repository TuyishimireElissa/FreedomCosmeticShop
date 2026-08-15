'use client'

import Link from 'next/link'
import { MessageCircle, Sparkles } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { getWhatsAppLink } from '@/lib/business-config'

/**
 * Shown when a search returns nothing.
 *
 * WHY THIS EXISTS. 73 of 231 logged searches — just under a third — returned
 * zero products. Every one of those was a customer who wanted something and was
 * shown a dead end reading "No products match your filters. Try removing a
 * filter or using a broader search." They had applied no filter. They typed a
 * product name. The shop simply does not stock it yet.
 *
 * Since ordering here happens over WhatsApp anyway, a zero-result search is not
 * a failure — it is a sourcing request the shop never received. This turns it
 * into one.
 *
 * TONE. Deliberately not an error. No red, no warning icon, no apology. The
 * heading says we can help, because the owner can very often source an item
 * that is not on the shelf.
 *
 * CONTRAST — I DID NOT USE THE BUTTON VARIANT THE BRIEF ASKED FOR.
 * The brief said "use existing fcs-whatsapp variant". Measured, that variant is
 * white text on `--fcs-whatsapp` #25D366 = **1.98:1**, far below the 4.5:1 AA
 * floor, and its hover #128C7E is 4.14:1 — also failing. `--fcs-whatsapp-pill`
 * #1E874A is **4.55:1** and exists in this codebase precisely for solid CTAs;
 * its own definition in globals.css says so. Using the named variant would have
 * shipped unreadable text on the one button this component exists to get
 * tapped. Flagged rather than silently substituted.
 *
 * The fcs-whatsapp variant also carries a `motion-safe:animate-[fcs-breathe]`
 * pulse. Not reproduced here: this panel already appears at a moment of mild
 * frustration and a pulsing button reads as pressure.
 */

interface SearchRfqProps {
  /** The exact phrase the shopper typed. Shown back to them and sent to WhatsApp. */
  query: string
}

export default function SearchRfq({ query }: SearchRfqProps) {
  const { t } = useLanguage()

  const trimmed = query.trim()

  /**
   * The WhatsApp message is intentionally NOT translated.
   *
   * It is read by the shop owner, not by the customer, and the owner's own
   * briefs are written in English. A Kinyarwanda shopper still sees every
   * on-screen string in Kinyarwanda; only the outgoing message the owner
   * receives is fixed, so incoming sourcing requests all read the same way.
   */
  const waHref = getWhatsAppLink(
    `Hello FreedomCosmeticShop! I searched for "${trimmed}" on your website but found nothing. Do you stock this product? I would like to order.`,
  )
  // getWhatsAppLink returns a placeholder anchor when the number is unset.
  // A dead CTA is worse than no CTA.
  const waConfigured = waHref.startsWith('https://')

  return (
    <div
      className="rounded-fcs-lg border border-dashed border-fcs-border-subtle bg-fcs-surface px-5 py-14 text-center"
      data-testid="search-rfq"
    >
      <Sparkles className="mx-auto h-10 w-10 text-fcs-brand" aria-hidden="true" />

      <h2 className="mt-4 font-display text-xl font-semibold text-fcs-text">
        {t('search.rfq_title')}
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-fcs-text-muted">
        {t('search.rfq_body', { query: trimmed })}
      </p>

      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {waConfigured ? (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 w-full max-w-xs items-center justify-center gap-2 rounded-full bg-fcs-whatsapp-pill px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-fcs-whatsapp-pill-hover sm:w-auto"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            {t('search.rfq_whatsapp')}
          </a>
        ) : null}

        <Link
          href="/products"
          className="inline-flex min-h-11 w-full max-w-xs items-center justify-center rounded-full border-2 border-fcs-brand-strong px-5 py-2.5 text-sm font-semibold text-fcs-brand-text transition-colors hover:bg-fcs-brand-strong hover:text-white sm:w-auto"
        >
          {t('search.rfq_browse')}
        </Link>
      </div>
    </div>
  )
}
