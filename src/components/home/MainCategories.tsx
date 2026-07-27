'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Category } from '@/lib/types'
import { useT } from '@/lib/i18n/LanguageContext'

interface MainCategoriesProps {
  categories: Category[]
  loading?: boolean
  error?: string | null
}

const PRIORITY_SLUGS = ['skincare', 'haircare', 'hair-care', 'body-care', 'bath-body', 'makeup']
const TRANSLATION_KEYS: Record<string, string> = {
  skincare: 'categories.skincare',
  haircare: 'categories.haircare',
  'hair-care': 'categories.haircare',
  'body-care': 'categories.body_care',
  'bath-body': 'categories.body_care',
  makeup: 'categories.makeup',
}
const FALLBACKS = [
  'from-[#8F5D68] to-[#C99AA2]',
  'from-[#765D4B] to-[#C4956A]',
  'from-[#44564A] to-[#8CA08E]',
]

export default function MainCategories({ categories, loading = false, error }: MainCategoriesProps) {
  const t = useT()
  const mainCategories = useMemo(() => {
    const selected: Category[] = []
    const used = new Set<string>()
    for (const slug of PRIORITY_SLUGS) {
      const category = categories.find((item) => item.slug === slug)
      if (category && !used.has(category.id)) { selected.push(category); used.add(category.id) }
      if (selected.length === 3) return selected
    }
    for (const category of categories) {
      if (!used.has(category.id)) { selected.push(category); used.add(category.id) }
      if (selected.length === 3) break
    }
    return selected
  }, [categories])

  if (error) return null
  return (
    <section className="bg-white px-4 py-10 md:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div><p className="text-xs font-medium uppercase tracking-[0.18em] text-[#B76E79]">{t('nav.categories')}</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-[#1a1a1a] md:text-3xl">{t('home.shop_category')}</h2></div>
          <Link href="/products" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#B76E79] transition-colors hover:text-[#9B5A64]">{t('home.view_all')}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-3 gap-3 md:gap-6">{[0, 1, 2].map((item) => <div key={item} className="aspect-[3/4] animate-pulse rounded-xl bg-[#F3F3F3] motion-reduce:animate-none md:aspect-[4/3]" />)}</div>
        ) : mainCategories.length ? (
          <div className="scrollbar-hide -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0">
            {mainCategories.map((category, index) => {
              const label = TRANSLATION_KEYS[category.slug] ? t(TRANSLATION_KEYS[category.slug]) : category.name
              return <Link key={category.id} href={`/products?category=${encodeURIComponent(category.slug)}`} className={`group relative aspect-[3/4] w-[78vw] max-w-[340px] flex-none snap-start overflow-hidden rounded-xl bg-gradient-to-br ${FALLBACKS[index] || FALLBACKS[0]} md:aspect-[4/3] md:w-auto md:max-w-none`}>
                {category.image && <Image src={category.image} alt="" fill sizes="(max-width: 768px) 78vw, 33vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none" loading="lazy" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" aria-hidden="true" />
                <div className="absolute inset-x-0 bottom-0 p-5 md:p-6"><h3 className="text-xl font-bold text-white md:text-2xl">{label}</h3><span className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-white/90">{t('home.view_all')}<ArrowRight className="h-4 w-4" aria-hidden="true" /></span></div>
              </Link>
            })}
          </div>
        ) : null}
      </div>
    </section>
  )
}
