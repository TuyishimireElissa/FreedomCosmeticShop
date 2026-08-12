'use client'

import { Award, Building2, MessageCircle, Phone, ShieldCheck, Truck, Wallet } from 'lucide-react'
import { BUSINESS, OWNER_TODO } from '@/lib/business-config'
import { useT } from '@/lib/i18n/LanguageContext'
import { useReveal } from '@/hooks/use-reveal'

interface TrustItem {
  icon: typeof Truck
  color: string
  title: string
  detail: string
}

function isConfigured(value: string) {
  return value !== OWNER_TODO && !value.includes('TODO:')
}

export default function TrustSection() {
  const t = useT()

  // Owner-specified copy, WhatsApp-led. These four answer the questions a
  // first-time Rwandan buyer actually asks — can I talk to a human, when do I
  // pay, will it reach my district, is it real — in that order.
  //
  // Every claim here is verified against the running system: WhatsApp is the
  // live order channel, cash-on-delivery is real, the delivery API returns all
  // 30 districts across 5 fee zones, and authenticity is the shop's stated
  // sourcing policy. Nothing invented.
  //
  // Icon tiles use fcs-* tokens rather than the old per-item Tailwind palette
  // (bg-blue-50, bg-purple-50 ...), which was six unrelated hues on one row.
  const trustItems: TrustItem[] = [
    {
      icon: MessageCircle,
      color: 'bg-fcs-surface-muted text-fcs-umber',
      title: t('home.trust_advice_title'),
      detail: t('home.trust_advice_detail'),
    },
    {
      icon: Wallet,
      color: 'bg-fcs-surface-muted text-fcs-umber',
      title: t('home.trust_pay_title'),
      detail: t('home.trust_pay_detail'),
    },
    {
      icon: Truck,
      color: 'bg-fcs-surface-muted text-fcs-umber',
      title: t('home.trust_delivery_title'),
      detail: t('home.trust_delivery_detail'),
    },
    {
      icon: ShieldCheck,
      color: 'bg-fcs-surface-muted text-fcs-umber',
      title: t('home.trust_authentic_title'),
      detail: t('home.trust_authentic_copy'),
    },
  ]

  if (isConfigured(BUSINESS.rdbNumber)) {
    trustItems.push({
      icon: Award,
      color: 'bg-fcs-surface-muted text-fcs-umber',
      title: t('home.trust_registered_business'),
      detail: t('home.trust_rdb_number', { number: BUSINESS.rdbNumber }),
    })
  }

  if (isConfigured(BUSINESS.address.sector) && isConfigured(BUSINESS.address.district)) {
    trustItems.push({
      icon: Building2,
      color: 'bg-fcs-surface-muted text-fcs-umber',
      title: t('home.trust_location'),
      // Nyarugenge is both the sector and the district containing it, so
      // interpolating both produced "Nyarugenge, Nyarugenge, Kigali".
      detail: t('home.trust_location_detail', { sector: BUSINESS.address.sector }),
    })
  }

  if (isConfigured(BUSINESS.whatsapp) && isConfigured(BUSINESS.supportHours.weekdays)) {
    trustItems.push({
      icon: Phone,
      color: 'bg-fcs-surface-muted text-fcs-umber',
      title: t('footer.local_support'),
      detail: t('home.trust_support_hours', { hours: BUSINESS.supportHours.weekdays }),
    })
  }

  return (
    <section className="bg-fcs-surface px-4 py-10 md:py-16" aria-labelledby="trust-title">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 text-center md:mb-8">
          <h2 id="trust-title" className="mb-2 font-display text-3xl font-normal text-fcs-text md:text-3xl">{t('home.trust_title')}</h2>
          <p className="mx-auto max-w-md text-sm text-gray-500">{t('home.trust_subtitle')}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {trustItems.map((item, index) => {
            const Icon = item.icon
            return (
              <TrustCard key={item.title} index={index}>
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${item.color}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mb-1 text-sm font-bold leading-tight text-fcs-text">{item.title}</h3>
                <p className="text-xs leading-relaxed text-fcs-text-muted">{item.detail}</p>
              </TrustCard>
            )
          })}
        </div>

        <p className="mx-auto mt-6 max-w-lg text-center text-xs text-gray-500">{t('home.trust_note')}</p>
      </div>
    </section>
  )
}

/**
 * One trust card, revealed on scroll.
 *
 * The stagger is an inline transitionDelay rather than six Tailwind classes,
 * because arbitrary delay values would each generate their own utility and the
 * index is data-driven. Capped at 300ms: past that the last card feels late
 * rather than choreographed.
 */
function TrustCard({ index, children }: { index: number; children: React.ReactNode }) {
  const ref = useReveal<HTMLDivElement>()
  return (
    <div
      ref={ref}
      className="fcs-reveal rounded-fcs-md border border-fcs-border-subtle bg-fcs-surface-elevated p-5 shadow-fcs-1"
      style={{ transitionDelay: `${Math.min(index, 3) * 100}ms` }}
    >
      {children}
    </div>
  )
}
