'use client'

import Link from 'next/link'
import { useT } from '@/lib/i18n/LanguageContext'

type EmptyStateType = 'cart' | 'wishlist' | 'orders' | 'products' | 'reviews' | 'search'

export default function EmptyState({ type, query }: { type: EmptyStateType; query?: string }) {
  const t = useT()
  const icons: Record<EmptyStateType, string> = { cart: '🛒', wishlist: '❤️', orders: '📦', products: '🔍', reviews: '⭐', search: '🔍' }
  const title = type === 'search' && query ? t('empty.search', { query }) : t(`empty.${type}`)
  const hint = type === 'search' ? t('empty.search_hint') : t(`empty.${type}_hint`)
  const canBrowse = ['cart', 'wishlist', 'orders', 'products', 'search'].includes(type)

  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <span className="mb-4 text-6xl" aria-hidden="true">{icons[type]}</span>
      <h3 className="mb-2 text-xl font-bold text-gray-900">{title}</h3>
      <p className="mb-6 max-w-sm text-gray-500">{hint}</p>
      {canBrowse && <Link href="/products" className="rounded-full bg-[#B76E79] px-5 py-2.5 text-sm font-bold text-white">{t('nav.products')} →</Link>}
    </div>
  )
}
