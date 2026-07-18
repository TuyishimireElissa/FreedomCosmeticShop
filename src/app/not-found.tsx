'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft, Search, Sparkles } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageContext'

export default function NotFound() {
  const t = useT()
  const pathname = usePathname()

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/analytics/404', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname, referrer: document.referrer || undefined }),
      signal: controller.signal,
      keepalive: true,
    }).catch(() => {})
    return () => controller.abort()
  }, [pathname])

  const suggestions = [
    { href: '/products?category=skincare', label: t('categories.skincare') },
    { href: '/products?category=haircare', label: t('categories.haircare') },
    { href: '/products?category=makeup', label: t('categories.makeup') },
  ]

  return (
    <main className="relative grid min-h-[70vh] place-items-center overflow-hidden bg-gradient-to-br from-white via-rose-50 to-[#fff8e7] px-4 py-16">
      <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-[#B76E79]/15 blur-3xl" aria-hidden="true" />
      <div className="relative max-w-xl text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#B76E79] text-2xl font-black text-white shadow-xl" aria-hidden="true">F</span>
        <p className="mt-6 text-sm font-black uppercase tracking-[0.25em] text-[#B76E79]">{t('pages.error_404')}</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-[#1a1a1a] sm:text-5xl">{t('errors.page_not_found')}</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-gray-500">{t('pages.not_found_hint')}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#1a1a1a] px-6 text-sm font-black text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />{t('pages.back_home')}
          </Link>
          <Link href="/products" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#B76E79] px-6 text-sm font-black text-white">
            <Search className="h-4 w-4" aria-hidden="true" />{t('cart.browse_products')}
          </Link>
        </div>

        <nav className="mt-8 border-t border-rose-100 pt-6" aria-label={t('pages.or_try')}>
          <p className="mb-2 text-sm text-gray-500">{t('pages.or_try')}</p>
          <ul className="flex flex-wrap justify-center gap-2">
            {suggestions.map((suggestion) => (
              <li key={suggestion.href}>
                <Link href={suggestion.href} className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-[#9c5964] hover:bg-rose-50 hover:underline">
                  {suggestion.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="mt-8 flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500">
          <Sparkles className="h-3.5 w-3.5 text-[#9c7a00]" aria-hidden="true" />{t('pages.beauty_freedom_brand')}
        </p>
      </div>
    </main>
  )
}
