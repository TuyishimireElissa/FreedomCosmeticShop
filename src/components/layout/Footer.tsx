'use client'

import {
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Truck,
} from 'lucide-react'
import Link from 'next/link'
import { BUSINESS, getWhatsAppLink } from '@/lib/business-config'
import { useT } from '@/lib/i18n/LanguageContext'

const shopLinks = [
  { key: 'all', translationKey: 'categories.all', slug: null },
  { key: 'skincare', translationKey: 'categories.skincare', slug: 'skincare' },
  { key: 'makeup', translationKey: 'categories.makeup', slug: 'makeup' },
  { key: 'haircare', translationKey: 'categories.haircare', slug: 'haircare' },
  { key: 'fragrance', translationKey: 'categories.fragrance', slug: 'fragrance' },
  { key: 'body-care', translationKey: 'categories.body_care', slug: 'body-care' },
]

const trustBadges = [
  { icon: ShieldCheck, titleKey: 'footer.genuine', subtitleKey: 'footer.genuine_products' },
  { icon: Truck, titleKey: 'footer.fast_delivery', subtitleKey: 'footer.all_districts' },
  { icon: Phone, titleKey: 'checkout.mtn_momo', subtitleKey: 'footer.simple_payment' },
  { icon: MessageCircle, titleKey: 'footer.local_support', subtitleKey: 'footer.here_to_help' },
]

export default function Footer() {
  const t = useT()
  return (
    <footer className="bg-[#1a1a1a] text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <section>
            <Link href="/" className="flex items-center gap-3 text-left" aria-label={t('nav.home')}>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-[#c98892] to-[#9e5964] text-lg font-black shadow-lg shadow-black/20">F</span>
              <span>
                <span className="block text-lg font-extrabold leading-none">{BUSINESS.tradingName}</span>
                <span className="mt-1 block text-xs font-medium text-[#d999a3]">{BUSINESS.tagline} 🇷🇼</span>
              </span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-6 text-gray-400">
              {t('footer.description')}
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-white">{t('footer.shop')}</h2>
            <ul className="mt-5 space-y-3">
              {shopLinks.map((item) => (
                <li key={item.key}>
                  <Link href={item.slug ? `/products?category=${item.slug}` : '/products'} className="flex min-h-11 items-center py-2 text-sm text-gray-400 transition-colors hover:text-[#e6a6b0]">
                    {t(item.translationKey)}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/wholesale" className="flex min-h-11 items-center py-2 text-sm font-semibold text-[#e6a6b0] transition-colors hover:text-white">
                  {t('footer.wholesale_beauty')}
                </Link>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-white">{t('footer.help')}</h2>
            <ul className="mt-5 space-y-3 text-sm">
              <li><Link href="/track-order" className="flex min-h-11 items-center py-2 text-gray-400 transition-colors hover:text-white">{t('footer.track_order')}</Link></li>
              <li><span className="text-gray-400">{t('footer.delivery_kigali')}</span></li>
              <li><span className="text-gray-400">{t('footer.delivery_provinces')}</span></li>
              <li><Link href="/shipping" className="flex min-h-11 items-center py-2 text-gray-400 transition-colors hover:text-white">{t('footer.shipping_policy')}</Link></li>
              <li><Link href="/returns" className="flex min-h-11 items-center py-2 text-gray-400 transition-colors hover:text-white">{t('footer.returns_refunds')}</Link></li>
              <li><Link href="/faq" className="flex min-h-11 items-center py-2 text-gray-400 transition-colors hover:text-white">{t('footer.faq')}</Link></li>
              <li><Link href="/privacy" className="flex min-h-11 items-center py-2 text-gray-400 transition-colors hover:text-white">{t('footer.privacy_policy')}</Link></li>
              <li><Link href="/terms" className="flex min-h-11 items-center py-2 text-gray-400 transition-colors hover:text-white">{t('footer.terms_conditions')}</Link></li>
            </ul>
          </section>

          <section>
            <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-white">{t('footer.contact')}</h2>
            <div className="mt-5 space-y-4">
              <a href={BUSINESS.phone.includes('TODO') ? undefined : `tel:${BUSINESS.phone}`} className="flex min-h-11 items-center gap-3 py-2 text-sm text-gray-400 transition-colors hover:text-white"><Phone className="h-4 w-4 shrink-0 text-[#d999a3]" />{BUSINESS.phoneDisplay}</a>
              <a href={BUSINESS.email.includes('TODO') ? undefined : `mailto:${BUSINESS.email}`} className="flex min-h-11 items-center gap-3 break-all py-2 text-sm text-gray-400 transition-colors hover:text-white"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#d999a3]" />{BUSINESS.email}</a>
              <p className="flex items-center gap-3 text-sm text-gray-400"><MapPin className="h-4 w-4 shrink-0 text-[#d999a3]" />{BUSINESS.address.short}, {BUSINESS.address.country} 🇷🇼</p>
              <a href={BUSINESS.whatsapp.includes('TODO') ? undefined : getWhatsAppLink()} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#20bd5a]"><MessageCircle className="h-4 w-4" />{t('footer.whatsapp_chat')}</a>
            </div>
            <div className="mt-6">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">{t('footer.we_accept')}</p>
              <div className="flex flex-wrap gap-2">
                {['💛 MTN MoMo', '🔴 Airtel', '💳 Visa', '💵 COD'].map((payment) => <span key={payment} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-gray-300">{payment}</span>)}
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="border-y border-white/10 bg-white/[0.025]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-4 py-6 sm:px-6 md:grid-cols-4 lg:px-8">
          {trustBadges.map(({ icon: Icon, titleKey, subtitleKey }) => (
            <div key={titleKey} className="flex flex-col items-center px-2 py-3 text-center sm:flex-row sm:items-start sm:justify-center sm:gap-3 sm:text-left">
              <Icon className="mb-2 h-6 w-6 shrink-0 text-[#d999a3] sm:mb-0" />
              <span><span className="block text-xs font-bold sm:text-sm">{t(titleKey)}</span><span className="mt-0.5 block text-xs text-gray-500 sm:text-xs">{t(subtitleKey)}</span></span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-black/30">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-center text-xs text-gray-500 sm:px-6 md:flex-row md:text-left lg:px-8">
          <p>© {new Date().getFullYear()} {BUSINESS.name}. {t('footer.all_rights_reserved')}</p>
          <p>{t('footer.made_in_rwanda')}</p>
        </div>
      </div>
    </footer>
  )
}
