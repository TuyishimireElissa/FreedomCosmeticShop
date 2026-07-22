'use client'

import { Award, Building2, CreditCard, Phone, RotateCcw, ShieldCheck, Truck } from 'lucide-react'
import { BUSINESS, OWNER_TODO } from '@/lib/business-config'
import { useT } from '@/lib/i18n/LanguageContext'

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

  const trustItems: TrustItem[] = [
    {
      icon: Truck,
      color: 'bg-blue-50 text-blue-700',
      title: t('delivery.kigali_same_day'),
      detail: t('home.trust_kigali_delivery'),
    },
    {
      icon: RotateCcw,
      color: 'bg-green-50 text-green-700',
      title: t('footer.returns_refunds'),
      detail: t('home.trust_returns', { days: BUSINESS.policies.returnDays }),
    },
    {
      icon: CreditCard,
      color: 'bg-yellow-50 text-yellow-700',
      title: t('nav.payment_methods'),
      detail: t('home.trust_payment_providers'),
    },
    {
      icon: ShieldCheck,
      color: 'bg-[#B76E79]/10 text-[#8a4a55]',
      title: t('product.authentic_guarantee'),
      detail: t('home.trust_authentic_detail'),
    },
  ]

  if (isConfigured(BUSINESS.rdbNumber)) {
    trustItems.push({
      icon: Award,
      color: 'bg-purple-50 text-purple-700',
      title: t('home.trust_registered_business'),
      detail: t('home.trust_rdb_number', { number: BUSINESS.rdbNumber }),
    })
  }

  if (isConfigured(BUSINESS.address.sector) && isConfigured(BUSINESS.address.district)) {
    trustItems.push({
      icon: Building2,
      color: 'bg-orange-50 text-orange-700',
      title: t('home.trust_location'),
      detail: t('home.trust_location_detail', { sector: BUSINESS.address.sector, district: BUSINESS.address.district }),
    })
  }

  if (isConfigured(BUSINESS.whatsapp) && isConfigured(BUSINESS.supportHours.weekdays)) {
    trustItems.push({
      icon: Phone,
      color: 'bg-emerald-50 text-emerald-700',
      title: t('footer.local_support'),
      detail: t('home.trust_support_hours', { hours: BUSINESS.supportHours.weekdays }),
    })
  }

  return (
    <section className="bg-[#FAFAFA] px-4 py-10 md:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 text-center md:mb-8">
          <h2 className="mb-2 text-2xl font-bold text-[#1a1a1a] md:text-3xl">{t('home.trust_title')}</h2>
          <p className="mx-auto max-w-md text-sm text-gray-500">{t('home.trust_subtitle')}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {trustItems.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.title} className="rounded-xl border border-[#EEEEEE] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${item.color}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mb-1 text-sm font-bold leading-tight text-gray-900">{item.title}</h3>
                <p className="text-xs leading-relaxed text-gray-500">{item.detail}</p>
              </div>
            )
          })}
        </div>

        <p className="mx-auto mt-6 max-w-lg text-center text-xs text-gray-500">{t('home.trust_note')}</p>
      </div>
    </section>
  )
}
