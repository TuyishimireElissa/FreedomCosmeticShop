'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Category } from '@/lib/types'
import { useT } from '@/lib/i18n/LanguageContext'

interface MainCategoriesProps {
  categories: Category[]
  loading?: boolean
  error?: string | null
}

const PRIORITY_SLUGS = ['skincare', 'haircare', 'hair-care', 'body-care', 'bath-body', 'makeup']

const CATEGORY_STYLE = [
  { gradient: 'from-pink-100 to-rose-50', border: 'border-pink-200', text: 'text-rose-800', icon: '🧴' },
  { gradient: 'from-amber-50 to-yellow-50', border: 'border-amber-200', text: 'text-amber-800', icon: '💇' },
  { gradient: 'from-emerald-50 to-teal-50', border: 'border-emerald-200', text: 'text-emerald-800', icon: '🧼' },
]

const TRANSLATION_KEYS: Record<string, string> = {
  skincare: 'categories.skincare',
  haircare: 'categories.haircare',
  'hair-care': 'categories.haircare',
  'body-care': 'categories.body_care',
  'bath-body': 'categories.body_care',
  makeup: 'categories.makeup',
}

export default function MainCategories({ categories, loading = false, error }: MainCategoriesProps) {
  const t = useT()
  const mainCategories = useMemo(() => {
    const selected: Category[] = []
    const used = new Set<string>()

    for (const slug of PRIORITY_SLUGS) {
      const category = categories.find((item) => item.slug === slug)
      if (category && !used.has(category.id)) {
        selected.push(category)
        used.add(category.id)
      }
      if (selected.length === 3) return selected
    }

    for (const category of categories) {
      if (!used.has(category.id)) {
        selected.push(category)
        used.add(category.id)
      }
      if (selected.length === 3) break
    }

    return selected
  }, [categories])

  if (error) return null

  return (
    <section className="px-4 py-6 md:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-900 md:text-xl">{t('home.shop_category')}</h2>
          <Link href="/products" className="flex min-h-11 shrink-0 items-center px-2 text-sm font-medium text-[#B76E79] transition-colors hover:text-[#a55d68]">
            {t('home.view_all')} →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 gap-2.5 md:gap-4">
            {[0, 1, 2].map((item) => <div key={item} className="aspect-[3/4] animate-pulse rounded-2xl bg-gray-100 md:aspect-[4/3]" />)}
          </div>
        ) : mainCategories.length > 0 ? (
          <div className="grid grid-cols-3 gap-2.5 md:gap-4">
            {mainCategories.map((category, index) => {
              const style = CATEGORY_STYLE[index] || CATEGORY_STYLE[0]
              const labelKey = TRANSLATION_KEYS[category.slug]
              const label = labelKey ? t(labelKey) : category.name

              return (
                <Link
                  key={category.id}
                  href={`/products?category=${encodeURIComponent(category.slug)}`}
                  aria-label={label}
                  className={`group relative flex aspect-[3/4] min-w-0 touch-manipulation flex-col items-center justify-end overflow-hidden rounded-2xl border bg-gradient-to-br p-2.5 transition-shadow duration-150 hover:shadow-md md:aspect-[4/3] md:p-5 ${style.gradient} ${style.border}`}
                >
                  {category.image && (
                    <Image
                      src={category.image}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 33vw, 300px"
                      className="object-cover opacity-35 transition-opacity duration-150 group-hover:opacity-45"
                      loading="lazy"
                    />
                  )}
                  <div className={`absolute inset-0 bg-gradient-to-t ${style.gradient} opacity-55`} aria-hidden="true" />
                  <span className="relative z-10 mb-1 text-3xl drop-shadow-sm md:text-4xl" aria-hidden="true">
                    {category.icon || style.icon}
                  </span>
                  <span className={`relative z-10 w-full text-center text-xs font-bold leading-tight md:text-sm ${style.text}`}>
                    {label}
                  </span>
                </Link>
              )
            })}
          </div>
        ) : null}

        {!loading && mainCategories.length > 0 && (
          <Link href="/products" className="mt-3 flex min-h-11 w-full items-center justify-center text-sm font-medium text-gray-600 transition-colors hover:text-[#B76E79]">
            {t('nav.categories')} →
          </Link>
        )}
      </div>
    </section>
  )
}
