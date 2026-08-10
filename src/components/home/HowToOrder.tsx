'use client'

/**
 * How to order — three steps.
 *
 * WhatsApp ordering is unusual enough that a first-time visitor needs to be
 * told how it works before they trust it. Static content by design: no fetch,
 * no state, nothing that can fail or make the page wait on 3G.
 *
 * Step 3 names the payment methods that actually work today — MoMo, Airtel,
 * cash on delivery. Cards are deliberately absent because `payments.enabled`
 * is false and promising them would be a lie the shop cannot honour.
 */

import { MessageCircle, ShoppingBasket, Truck } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageContext'

const STEPS = [
  { key: 'how_step1', icon: ShoppingBasket },
  { key: 'how_step2', icon: MessageCircle },
  { key: 'how_step3', icon: Truck },
] as const

export default function HowToOrder() {
  const t = useT()

  return (
    <section className="bg-fcs-surface px-4 py-10 md:py-16" aria-labelledby="how-to-order-title">
      <div className="mx-auto max-w-5xl">
        <div className="mb-7 text-center md:mb-10">
          <h2 id="how-to-order-title" className="font-display text-3xl font-normal text-fcs-text">
            {t('home.how_title')}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-fcs-text-muted">{t('home.how_subtitle')}</p>
        </div>

        {/* Ordered list: the sequence is the meaning, so it must survive with
          * CSS off and be announced correctly by a screen reader. */}
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            return (
              <li
                key={step.key}
                className="relative rounded-fcs-md border border-fcs-border bg-white p-5 shadow-fcs-1"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-fcs-brand-strong text-base font-bold text-white"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <Icon className="h-5 w-5 shrink-0 text-fcs-brand-text" aria-hidden="true" />
                </div>
                <h3 className="mt-3.5 text-base font-bold leading-snug text-fcs-text">
                  {t(`home.${step.key}_title`)}
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-fcs-text-muted">
                  {t(`home.${step.key}_body`)}
                </p>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
