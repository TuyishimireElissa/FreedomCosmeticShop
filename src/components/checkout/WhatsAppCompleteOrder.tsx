'use client'

import { useState } from 'react'
import { AlertCircle, Check, Copy, Loader2, Mail, MessageCircle, Phone, ShieldCheck } from 'lucide-react'
import { BUSINESS } from '@/lib/business-config'
import { useT } from '@/lib/i18n/LanguageContext'
import { buildWhatsAppOrderMessage, normalizeWhatsAppNumber, type WhatsAppOrderData } from '@/lib/whatsapp/buildOrderMessage'

interface Props {
  /** Saves the order server-side and resolves with the persisted reference. */
  onCreateOrder: () => Promise<WhatsAppOrderData | null>
  disabled?: boolean
  /**
   * True when the caller has already shown the customer why it failed.
   *
   * Without this the page rendered TWO red banners for one failure: the
   * caller's specific reason ("check your phone number") and this card's
   * generic "we could not save your order, try again" underneath it — which
   * contradicted the first and told the customer to retry something that
   * could not succeed. Reported from a real screenshot showing both at once.
   */
  reportsOwnErrors?: boolean
}

/**
 * The single order-completion surface.
 *
 * Online payment methods are feature-flagged off (see /api/config/features), so
 * WhatsApp is the only path a customer takes. The order is always persisted
 * before wa.me opens — if the customer never sends the message, the order still
 * exists and can be followed up.
 */
export default function WhatsAppCompleteOrder({ onCreateOrder, disabled, reportsOwnErrors }: Props) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fallback, setFallback] = useState<{ url: string; message: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const benefits = [
    t('checkout.wa_benefit1'),
    t('checkout.wa_benefit2'),
    t('checkout.wa_benefit3'),
    t('checkout.wa_benefit4'),
    t('checkout.wa_benefit5'),
  ]

  async function submit() {
    if (busy || disabled) return
    setBusy(true)
    setError(null)
    try {
      const order = await onCreateOrder()
      if (!order) {
        // Stay silent when the caller has already explained the failure —
        // two contradictory banners is worse than one accurate one.
        if (!reportsOwnErrors) setError(t('checkout.wa_error'))
        return
      }
      const message = buildWhatsAppOrderMessage(order)
      const number = normalizeWhatsAppNumber(BUSINESS.whatsapp)
      const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`

      const opened = window.open(url, '_blank', 'noopener,noreferrer')
      // Popup blocked, or no WhatsApp handler — offer the manual routes rather
      // than leaving the customer on a dead button.
      if (!opened) setFallback({ url, message })
    } catch {
      setError(t('checkout.wa_error'))
    } finally {
      setBusy(false)
    }
  }

  async function copyMessage(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="rounded-fcs-lg border border-fcs-border bg-fcs-surface p-6 shadow-fcs-2 sm:p-8">
      <h2 className="flex items-center gap-2.5 font-display text-2xl font-normal text-fcs-text">
        <MessageCircle className="h-6 w-6 shrink-0 text-fcs-whatsapp" aria-hidden="true" />
        {t('checkout.wa_card_title')}
      </h2>

      <ul className="mt-5 space-y-2.5">
        {benefits.map((benefit) => (
          <li key={benefit} className="flex items-start gap-2.5 text-sm leading-6 text-fcs-text">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-fcs-whatsapp" aria-hidden="true" />
            {benefit}
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" aria-live="assertive" className="mt-5 flex items-center gap-2 rounded-fcs-md bg-red-50 p-3 text-sm font-semibold text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={busy || disabled}
        className="mt-6 flex min-h-14 w-full items-center justify-center gap-2.5 rounded-full bg-fcs-whatsapp px-8 text-base font-semibold text-white shadow-fcs-glow-wa transition-colors duration-150 hover:bg-fcs-whatsapp-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fcs-whatsapp focus-visible:ring-offset-2 disabled:opacity-50 motion-reduce:transition-none"
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <MessageCircle className="h-5 w-5" aria-hidden="true" />}
        {busy ? t('checkout.wa_sending') : t('checkout.wa_button')}
      </button>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-fcs-text-muted">
        <ShieldCheck className="h-3.5 w-3.5 text-fcs-sage" aria-hidden="true" />
        {t('checkout.wa_trust')}
      </p>
      <p className="mt-2 text-center text-xs leading-5 text-fcs-text-muted">{t('checkout.wa_footnote')}</p>
      <p className="mt-1 text-center text-xs text-fcs-text-muted">{t('checkout.wa_hours')}</p>

      {fallback && (
        <div role="dialog" aria-label={t('checkout.wa_fallback_title')} className="mt-6 rounded-fcs-md border border-fcs-border bg-white p-4">
          <p className="text-sm font-bold text-fcs-text">{t('checkout.wa_fallback_title')}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <a href={fallback.url} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-fcs-md bg-fcs-whatsapp px-4 text-sm font-semibold text-white">
              <MessageCircle className="h-4 w-4" aria-hidden="true" />{t('checkout.wa_open_web')}
            </a>
            <button type="button" onClick={() => copyMessage(fallback.message)} className="flex min-h-12 items-center justify-center gap-2 rounded-fcs-md border border-fcs-border px-4 text-sm font-semibold text-fcs-text">
              {copied ? <Check className="h-4 w-4 text-fcs-sage" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              {copied ? t('checkout.wa_copied') : t('checkout.wa_copy_message')}
            </button>
            <a href={`tel:${BUSINESS.whatsapp}`} className="flex min-h-12 items-center justify-center gap-2 rounded-fcs-md border border-fcs-border px-4 text-sm font-semibold text-fcs-text">
              <Phone className="h-4 w-4" aria-hidden="true" />{t('checkout.wa_call_us')}
            </a>
            <a href="mailto:freedomcosmeticshop@gmail.com" className="flex min-h-12 items-center justify-center gap-2 rounded-fcs-md border border-fcs-border px-4 text-sm font-semibold text-fcs-text">
              <Mail className="h-4 w-4" aria-hidden="true" />{t('checkout.wa_email_us')}
            </a>
          </div>
        </div>
      )}
    </section>
  )
}
