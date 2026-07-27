'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageContext'

export default function HomeSearch() {
  const t = useT()
  const router = useRouter()
  const [query, setQuery] = useState('')

  const handleSearch = (term: string) => {
    const normalized = term.trim()
    if (!normalized) return
    router.push(`/products?search=${encodeURIComponent(normalized)}`)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    handleSearch(query)
  }

  const quickSearches = [
    { label: t('categories.skincare'), query: 'uruhu' },
    { label: t('categories.haircare'), query: 'umusatsi' },
    { label: t('categories.body_care'), query: 'amavuta' },
    { label: t('categories.makeup'), query: 'kwisiga' },
    { label: t('search.price_under', { price: '10,000' }), query: 'munsi ya 10000 RWF' },
  ]

  return (
    <section className="relative z-10 -mt-5 bg-transparent px-4 pb-5 md:-mt-7 md:pb-8">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-3 shadow-[0_8px_30px_rgba(26,26,26,0.12)] md:p-4">
        <form onSubmit={submit} className="relative">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('search.placeholder')}
            className="min-h-[52px] w-full rounded-2xl border-2 border-gray-200 bg-white pl-5 pr-16 text-base text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-[#B76E79] focus:outline-none"
            aria-label={t('search.placeholder')}
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 flex h-11 w-11 -translate-y-1/2 touch-manipulation items-center justify-center rounded-xl bg-[#B76E79] text-white transition-colors hover:bg-[#a55d68]"
            aria-label={t('common.search')}
          >
            <Search className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="mr-1 shrink-0 text-xs font-medium text-gray-500">
            {t('search.popular')}:
          </span>
          {quickSearches.map((item) => (
            <button
              key={item.query}
              type="button"
              onClick={() => handleSearch(item.query)}
              className="min-h-11 touch-manipulation rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-[#B76E79]/10 hover:text-[#B76E79]"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
