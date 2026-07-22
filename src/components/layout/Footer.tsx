'use client'

import { Mail, MapPin, MessageCircle, Phone, ShieldCheck, Truck, CreditCard, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { BUSINESS, OWNER_TODO } from '@/lib/business-config'
import { useT } from '@/lib/i18n/LanguageContext'

const shopLinks = [
  { key: 'all', translationKey: 'categories.all', slug: null },
  { key: 'skincare', translationKey: 'categories.skincare', slug: 'skincare' },
  { key: 'makeup', translationKey: 'categories.makeup', slug: 'makeup' },
  { key: 'haircare', translationKey: 'categories.haircare', slug: 'haircare' },
  { key: 'body-care', translationKey: 'categories.body_care', slug: 'body-care' },
]
function configured(value: string) { return value !== OWNER_TODO && !value.includes('TODO:') }

export default function Footer() {
  const t = useT()
  const contactRows = [
    configured(BUSINESS.phone) && { icon: Phone, href: `tel:${BUSINESS.phone}`, text: BUSINESS.phoneDisplay },
    configured(BUSINESS.email) && { icon: Mail, href: `mailto:${BUSINESS.email}`, text: BUSINESS.email },
    configured(BUSINESS.address.sector) && configured(BUSINESS.address.district) && { icon: MapPin, href: null, text: `${BUSINESS.address.short}, ${BUSINESS.address.country}` },
  ].filter(Boolean) as Array<{ icon: typeof Phone; href: string | null; text: string }>

  return (
    <footer className="bg-[#1a1a1a] text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <section>
            <Link href="/" className="inline-block" aria-label={t('nav.home')}><span className="text-lg font-bold tracking-[-0.02em]">{BUSINESS.tradingName}</span><span className="mt-2 block text-[11px] font-medium text-[#AAAAAA]">{BUSINESS.tagline}</span></Link>
            <p className="mt-5 max-w-sm text-sm leading-6 text-[#AAAAAA]">{t('footer.description')}</p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs text-gray-300">{['MTN MoMo', 'Airtel Money', 'Visa', 'Mastercard', 'Cash on Delivery'].map((payment) => <span key={payment} className="rounded-lg border border-white/10 px-2.5 py-1.5">{payment}</span>)}</div>
          </section>

          <section><h2 className="text-xs font-semibold uppercase tracking-[0.16em]">{t('footer.shop')}</h2><ul className="mt-4 space-y-1">{shopLinks.map((item) => <li key={item.key}><Link href={item.slug ? `/products?category=${item.slug}` : '/products'} className="flex min-h-11 items-center text-sm text-[#AAAAAA] hover:text-white">{t(item.translationKey)}</Link></li>)}<li><Link href="/wholesale" className="flex min-h-11 items-center text-sm text-[#C4956A] hover:text-white">{t('footer.wholesale_beauty')}</Link></li></ul></section>

          <section><h2 className="text-xs font-semibold uppercase tracking-[0.16em]">{t('footer.help')}</h2><ul className="mt-4 space-y-1 text-sm">{[['/track-order','footer.track_order'],['/shipping','footer.shipping_policy'],['/returns','footer.returns_refunds'],['/faq','footer.faq'],['/privacy','footer.privacy_policy'],['/terms','footer.terms_conditions']].map(([href,key]) => <li key={href}><Link href={href} className="flex min-h-11 items-center text-[#AAAAAA] hover:text-white">{t(key)}</Link></li>)}</ul></section>

          <section><h2 className="text-xs font-semibold uppercase tracking-[0.16em]">{t('footer.contact')}</h2><div className="mt-4 space-y-1">{contactRows.map(({ icon: Icon, href, text }) => href ? <a key={text} href={href} className="flex min-h-11 items-center gap-3 text-sm text-[#AAAAAA] hover:text-white"><Icon className="h-4 w-4 text-[#C4956A]" aria-hidden="true" />{text}</a> : <p key={text} className="flex min-h-11 items-center gap-3 text-sm text-[#AAAAAA]"><Icon className="h-4 w-4 text-[#C4956A]" aria-hidden="true" />{text}</p>)}<Link href="/support/whatsapp" className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-[10px] bg-[#25D366] px-5 text-sm font-semibold text-white hover:bg-[#20bd5a]"><MessageCircle className="h-4 w-4" aria-hidden="true" />{t('footer.whatsapp_support')}</Link></div></section>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-3 border-t border-white/10 pt-8 md:grid-cols-4">{[
          { icon: ShieldCheck, title: t('footer.genuine'), text: t('footer.genuine_products') },
          { icon: Truck, title: t('footer.fast_delivery'), text: t('footer.all_districts') },
          { icon: CreditCard, title: t('nav.payment_methods'), text: t('footer.simple_payment') },
          { icon: RotateCcw, title: t('footer.returns_refunds'), text: t('footer.returns_days', { days: BUSINESS.policies.returnDays }) },
        ].map(({ icon: Icon, title, text }) => <div key={title} className="flex gap-3 rounded-xl border border-white/10 p-3"><Icon className="h-5 w-5 shrink-0 text-[#C4956A]" aria-hidden="true" /><span><strong className="block text-xs font-semibold">{title}</strong><span className="mt-1 block text-xs text-[#777777]">{text}</span></span></div>)}</div>
      </div>
      <div className="border-t border-white/10"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-center text-xs text-[#777777] sm:px-6 md:flex-row lg:px-8"><p>© {new Date().getFullYear()} {BUSINESS.name}. {t('footer.all_rights_reserved')}</p><p>{BUSINESS.address.country}</p></div></div>
    </footer>
  )
}
