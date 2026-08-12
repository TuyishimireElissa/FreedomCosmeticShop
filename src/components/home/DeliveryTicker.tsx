'use client'

/**
 * Recent deliveries as a slow marquee.
 *
 * Reads /api/orders/recent-deliveries, which returns at most three
 * {district, at} pairs and nothing else. Only DELIVERED orders qualify — a
 * CONFIRMED order means the owner accepted it, not that anyone received it,
 * and inventing a delivery to fill a shelf would be a lie about the business.
 *
 * Self-hides on empty. There are 0 delivered orders today, so this ships
 * dormant and lights up the first time the owner marks an order delivered.
 * That is deliberate: the alternative was fabricating placeholder districts.
 *
 * The list is duplicated once in the DOM so the translate can loop seamlessly.
 * The clone is aria-hidden, so a screen reader hears each delivery once.
 */

import { useCallback, useEffect, useState } from 'react'
import { Truck } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageContext'

interface Delivery {
  district: string
  at: string
}

export default function DeliveryTicker() {
  const t = useT()
  const [items, setItems] = useState<Delivery[]>([])

  const load = useCallback(async (signal: AbortSignal) => {
    try {
      const response = await fetch('/api/orders/recent-deliveries', { cache: 'no-store', signal })
      if (!response.ok) throw new Error()
      const payload = await response.json()
      if (!signal.aborted) setItems(Array.isArray(payload?.data) ? payload.data : [])
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError') && !signal.aborted) setItems([])
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  if (items.length === 0) return null

  const row = (ariaHidden: boolean) => (
    <ul className="flex shrink-0 items-center gap-8 px-4" aria-hidden={ariaHidden || undefined}>
      {items.map((item, index) => (
        <li key={`${item.district}-${index}`} className="flex flex-none items-center gap-2 whitespace-nowrap">
          <Truck className="h-4 w-4 shrink-0 text-fcs-umber" aria-hidden="true" />
          <span className="text-sm text-fcs-text">
            {t('home.ticker_delivered', { district: item.district })}
          </span>
        </li>
      ))}
    </ul>
  )

  return (
    <section
      aria-label={t('home.ticker_label')}
      className="fcs-marquee border-y border-fcs-border-subtle bg-fcs-surface-muted"
    >
      <div className="fcs-marquee-track flex h-10 items-center">
        {row(false)}
        {row(true)}
      </div>
    </section>
  )
}
