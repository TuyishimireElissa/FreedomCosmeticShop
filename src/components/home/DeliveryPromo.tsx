'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, Copy, MapPin, ShieldCheck, Tag, Truck } from 'lucide-react'
import { formatRWF } from '@/lib/format'
import { usePromotionUpdates } from '@/hooks/use-realtime'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface DeliveryZone {
  name: string
  code: string
  fee: number
  estimatedDays: number
  freeThreshold: number
  isSameDay: boolean
}

interface ActiveCoupon {
  code: string
  discountType: 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING'
  discountValue: number
  minimumOrder: number | null
  maximumDiscount: number | null
  usageLimitPerUser: number
  validUntil: string | null
  appliesToAllProducts: boolean
}

const FALLBACK_ZONES: DeliveryZone[] = [
  { name: 'Kigali', code: 'KIGALI_SAME_DAY', fee: 1000, estimatedDays: 0, freeThreshold: 50000, isSameDay: true },
  { name: 'Northern Province', code: 'NORTHERN', fee: 3000, estimatedDays: 3, freeThreshold: 50000, isSameDay: false },
  { name: 'Southern Province', code: 'SOUTHERN', fee: 3000, estimatedDays: 3, freeThreshold: 50000, isSameDay: false },
  { name: 'Eastern Province', code: 'EASTERN', fee: 3500, estimatedDays: 3, freeThreshold: 50000, isSameDay: false },
  { name: 'Western Province', code: 'WESTERN', fee: 4000, estimatedDays: 4, freeThreshold: 50000, isSameDay: false },
]

const ZONE_KEYS: Record<string, string> = {
  KIGALI_SAME_DAY: 'delivery.zone_kigali',
  NORTHERN: 'delivery.zone_north',
  SOUTHERN: 'delivery.zone_south',
  EASTERN: 'delivery.zone_east',
  WESTERN: 'delivery.zone_west',
}

export default function DeliveryPromo() {
  const { t, language } = useLanguage()
  const [zones, setZones] = useState<DeliveryZone[]>(FALLBACK_ZONES)
  const [activeCoupon, setActiveCoupon] = useState<ActiveCoupon | null>(null)
  const [couponLoading, setCouponLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const loadCoupon = useCallback(async () => {
    setCouponLoading(true)
    try {
      const response = await fetch('/api/coupons/active-homepage', { cache: 'no-store' })
      if (!response.ok) throw new Error()
      const data = await response.json()
      setActiveCoupon(data.success ? data.data || null : null)
    } catch {
      setActiveCoupon(null)
    } finally {
      setCouponLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/delivery/zones', { cache: 'no-store', signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error()
        return response.json()
      })
      .then((data) => {
        if (data.success && Array.isArray(data.zones) && data.zones.length > 0) {
          setZones(data.zones)
        }
      })
      .catch(() => {})

    void loadCoupon()
    return () => controller.abort()
  }, [loadCoupon])

  usePromotionUpdates(() => {
    void loadCoupon()
  })

  const freeThreshold = useMemo(() => {
    const thresholds = [...new Set(zones.map((zone) => zone.freeThreshold))]
    return thresholds.length === 1 ? thresholds[0] : null
  }, [zones])

  const copyCoupon = async () => {
    if (!activeCoupon) return
    try {
      await navigator.clipboard.writeText(activeCoupon.code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const discountText = activeCoupon
    ? activeCoupon.discountType === 'PERCENTAGE'
      ? t('home.coupon_percent', { value: activeCoupon.discountValue })
      : activeCoupon.discountType === 'FIXED'
        ? t('home.coupon_fixed', { amount: formatRWF(activeCoupon.discountValue) })
        : t('home.coupon_free_shipping')
    : ''

  return (
    <section className="bg-gray-50 px-4 py-6 md:py-8">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-4 text-lg font-bold text-gray-900 md:text-xl">{t('delivery.title')}</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
              <Truck className="h-5 w-5 text-[#B76E79]" aria-hidden="true" />
              {t('delivery.title')}
            </div>

            <div className="space-y-2.5">
              {zones.slice(0, 5).map((zone) => (
                <div key={zone.code} className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm ${zone.isSameDay ? 'border border-[#B76E79]/20 bg-[#B76E79]/10' : 'bg-gray-50'}`}>
                  <div className="flex min-w-0 items-center gap-2">
                    <MapPin className={`h-3.5 w-3.5 shrink-0 ${zone.isSameDay ? 'text-[#B76E79]' : 'text-gray-500'}`} aria-hidden="true" />
                    <span className="font-medium text-gray-900">{t(ZONE_KEYS[zone.code] || 'delivery.zone_other')}</span>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="block font-bold text-[#B76E79]">{formatRWF(zone.fee)}</span>
                    <span className="block text-xs text-gray-500">
                      {zone.isSameDay ? t('delivery.kigali_same_day') : t('delivery.business_days', { days: zone.estimatedDays })}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {freeThreshold !== null && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3">
                <span className="text-lg text-green-700" aria-hidden="true"></span>
                <p className="text-sm font-medium text-green-800">
                  {t('delivery.free_above', { amount: freeThreshold.toLocaleString('en-RW') })}
                </p>
              </div>
            )}
          </div>

          {couponLoading ? (
            <div className="min-h-64 animate-pulse rounded-2xl bg-gray-100 motion-reduce:animate-none" />
          ) : activeCoupon ? (
            <div className="rounded-2xl border-2 border-[#B76E79]/30 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
                <Tag className="h-5 w-5 text-[#B76E79]" aria-hidden="true" />
                {t('cart.coupon')}
              </div>

              <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-[#B76E79]/10 p-4">
                <span className="min-w-0 truncate font-mono text-2xl font-black tracking-wider text-[#B76E79]">{activeCoupon.code}</span>
                <button type="button" onClick={copyCoupon} className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-[#B76E79]/30 px-3 text-xs font-medium text-[#B76E79] transition-colors hover:bg-[#B76E79] hover:text-white" aria-label={t('home.copy_coupon', { code: activeCoupon.code })}>
                  {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                  {copied ? t('home.code_copied') : t('home.copy_code')}
                </button>
              </div>

              <p className="mb-3 text-base font-semibold text-gray-900">{discountText}</p>
              <ul className="space-y-2 text-sm text-gray-600">
                {activeCoupon.minimumOrder !== null && <li>• {t('home.coupon_minimum', { amount: formatRWF(activeCoupon.minimumOrder) })}</li>}
                {activeCoupon.maximumDiscount !== null && <li>• {t('home.coupon_maximum', { amount: formatRWF(activeCoupon.maximumDiscount) })}</li>}
                <li>• {t('home.coupon_per_user', { count: activeCoupon.usageLimitPerUser })}</li>
                {!activeCoupon.appliesToAllProducts && <li>• {t('home.coupon_selected_products')}</li>}
                {activeCoupon.validUntil && <li>• {t('home.coupon_valid_until', { date: new Date(activeCoupon.validUntil).toLocaleDateString(language === 'rw' ? 'rw-RW' : 'en-RW', { day: 'numeric', month: 'long', year: 'numeric' }) })}</li>}
              </ul>

              <Link href="/products" className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-[#B76E79] text-base font-semibold text-white transition-colors hover:bg-[#a55d68]">
                {t('home.hero_cta_primary')}
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
                <ShieldCheck className="h-5 w-5 text-[#B76E79]" aria-hidden="true" />
                {t('nav.payment_methods')}
              </div>
              <div className="space-y-3">
                {[
                  { icon: '', name: t('checkout.mtn_momo'), detail: t('product.pay_mobile_short') },
                  { icon: '', name: t('checkout.airtel_money'), detail: t('checkout.airtel_pay_prefixes') },
                  { icon: '', name: t('checkout.card_payment'), detail: t('checkout.flutterwave_secure') },
                  { icon: '', name: t('checkout.cod'), detail: t('checkout.cod_kigali_only') },
                ].map((method) => (
                  <div key={method.name} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                    <span className="text-2xl" aria-hidden="true">{method.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900">{method.name}</p>
                      <p className="text-xs text-gray-500">{method.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
