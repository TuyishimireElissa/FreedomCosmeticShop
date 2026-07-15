'use client'

import { X } from 'lucide-react'
import { formatRWF } from '@/lib/format'
import { useT } from '@/lib/i18n/LanguageContext'
import { type ProductFilters, useProductFilters } from '@/hooks/useProductFilters'

interface Chip {
  key: keyof ProductFilters
  label: string
}

export default function FilterChips() {
  const t = useT()
  const { filters, activeFilterCount, clearFilter, clearAllFilters } = useProductFilters()
  if (activeFilterCount === 0) return null

  const chips: Chip[] = []
  if (filters.category) chips.push({ key: 'category', label: t('search.filter_category', { category: filters.category }) })
  if (filters.brand) chips.push({ key: 'brand', label: t('search.filter_brand', { brand: filters.brand }) })
  if (filters.minPrice || filters.maxPrice) {
    const label = filters.minPrice && filters.maxPrice
      ? t('search.price_range', { min: Number(filters.minPrice).toLocaleString('en-RW'), max: Number(filters.maxPrice).toLocaleString('en-RW') })
      : filters.maxPrice
        ? t('search.price_under', { price: Number(filters.maxPrice).toLocaleString('en-RW') })
        : `${formatRWF(Number(filters.minPrice))}+`
    chips.push({ key: 'minPrice', label })
  }
  if (filters.skinType) chips.push({ key: 'skinType', label: t(`skin_types.${filters.skinType}`) })
  if (filters.hairType) chips.push({ key: 'hairType', label: t(`hair_types.${filters.hairType}`) })
  if (filters.inStock) chips.push({ key: 'inStock', label: t('search.in_stock_only') })
  if (filters.shade) chips.push({ key: 'shade', label: `${t('product.shade')}: ${filters.shade}` })
  if (filters.minRating) chips.push({ key: 'minRating', label: t('search.stars_up', { rating: filters.minRating }) })

  return (
    <div className="flex flex-wrap items-center gap-2 py-2" aria-label={t('search.filters_active', { count: activeFilterCount })}>
      {chips.map((chip) => (
        <span key={chip.key} className="inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full bg-rose-50 pl-3 pr-1.5 text-sm font-semibold text-[#9e5964]">
          <span className="max-w-48 truncate">{chip.label}</span>
          <button type="button" onClick={() => clearFilter(chip.key)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-rose-100" aria-label={t('search.remove_filter', { filter: chip.label })}><X className="h-3.5 w-3.5" /></button>
        </span>
      ))}
      {chips.length > 1 && <button type="button" onClick={clearAllFilters} className="inline-flex min-h-9 items-center gap-1 rounded-full bg-gray-100 px-3 text-sm font-semibold text-gray-600 hover:bg-gray-200">{t('search.clear_all_filters')}<X className="h-3.5 w-3.5" /></button>}
      <span className="ml-auto text-xs text-gray-400">{t('search.filters_active', { count: activeFilterCount })}</span>
    </div>
  )
}
