'use client'

import type { ReactNode } from 'react'
import { Star } from 'lucide-react'
import type { Brand, Category } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n/LanguageContext'
import { useProductFilters } from '@/hooks/useProductFilters'

interface FilterSidebarProps {
  availableCategories: Category[]
  availableBrands: Brand[]
  className?: string
}

const SKIN_TYPES = ['OILY', 'DRY', 'COMBINATION', 'NORMAL', 'SENSITIVE'] as const
const HAIR_TYPES = ['NATURAL', 'RELAXED', 'WAVY', 'CURLY', 'COILY', 'ALL_HAIR'] as const

export default function FilterSidebar({ availableCategories, availableBrands, className = '' }: FilterSidebarProps) {
  const t = useT()
  const { filters, activeFilterCount, setFilter, setFilters, clearAllFilters } = useProductFilters()
  const priceRanges = [
    { label: t('search.price_under', { price: '5,000' }), min: '', max: '5000' },
    { label: t('search.price_under', { price: '10,000' }), min: '', max: '10000' },
    { label: t('search.price_range', { min: '10,000', max: '30,000' }), min: '10000', max: '30000' },
    { label: t('search.price_range', { min: '30,000', max: '50,000' }), min: '30000', max: '50000' },
    { label: '50,000 RWF+', min: '50000', max: '' },
  ]

  return (
    <aside className={cn('sticky top-24 hidden w-60 shrink-0 self-start rounded-xl border border-[#EEEEEE] bg-white p-4 lg:block', className)} aria-label={t('search.filters')}>
      <div className="mb-4 flex min-h-9 items-center justify-between border-b border-[#EEEEEE] pb-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[#1a1a1a]">{t('search.filters')}</h2>
        {activeFilterCount > 0 && <button type="button" onClick={clearAllFilters} className="min-h-9 rounded-lg px-2 text-xs font-semibold text-[#B76E79] hover:bg-rose-50">{t('search.clear_all_filters')}</button>}
      </div>

      <div className="max-h-[calc(100vh-9rem)] overflow-y-auto pr-1">
        {availableCategories.length > 0 && <FilterSection title={t('nav.categories')}>
          <FilterButton selected={!filters.category} onClick={() => setFilter('category', '')} label={t('categories.all')} />
          {availableCategories.map((category) => <FilterButton key={category.id} selected={filters.category === category.slug} onClick={() => setFilter('category', filters.category === category.slug ? '' : category.slug)} label={category.name} />)}
        </FilterSection>}

        <FilterSection title={t('search.price_range_label')}>
          {priceRanges.map((range) => {
            const selected = filters.minPrice === range.min && filters.maxPrice === range.max
            return <FilterButton key={range.label} selected={selected} onClick={() => setFilters({ minPrice: selected ? '' : range.min, maxPrice: selected ? '' : range.max })} label={range.label} />
          })}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{t('search.minimum')}<input type="number" min="0" step="500" value={filters.minPrice} onChange={(event) => setFilter('minPrice', event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-800 outline-none transition-colors focus:border-[#B76E79]" /></label>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{t('search.maximum')}<input type="number" min="0" step="500" value={filters.maxPrice} onChange={(event) => setFilter('maxPrice', event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-800 outline-none transition-colors focus:border-[#B76E79]" /></label>
          </div>
        </FilterSection>

        <FilterSection title={t('search.skin_type')}>
          {SKIN_TYPES.map((skinType) => <FilterButton key={skinType} selected={filters.skinType === skinType} onClick={() => setFilter('skinType', filters.skinType === skinType ? '' : skinType)} label={t(`skin_types.${skinType}`)} />)}
        </FilterSection>

        <FilterSection title={t('product.hair_type')}>
          {HAIR_TYPES.map((hairType) => <FilterButton key={hairType} selected={filters.hairType === hairType} onClick={() => setFilter('hairType', filters.hairType === hairType ? '' : hairType)} label={t(`hair_types.${hairType}`)} />)}
        </FilterSection>

        {availableBrands.length > 0 && <FilterSection title={t('search.brand')}>
          {availableBrands.slice(0, 12).map((brand) => <FilterButton key={brand.id} selected={filters.brand === brand.slug} onClick={() => setFilter('brand', filters.brand === brand.slug ? '' : brand.slug)} label={brand.name} />)}
        </FilterSection>}

        <FilterSection title={t('product.shade')}>
          <input type="search" value={filters.shade} onChange={(event) => setFilter('shade', event.target.value)} className="min-h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition-colors focus:border-[#B76E79]" aria-label={t('product.shade')} />
        </FilterSection>

        <FilterSection title={t('search.customer_rating')}>
          {[4, 3, 2].map((rating) => <button key={rating} type="button" onClick={() => setFilter('minRating', filters.minRating === String(rating) ? '' : String(rating))} className={cn('flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-sm transition-colors', filters.minRating === String(rating) ? 'bg-rose-50 font-semibold text-[#B76E79]' : 'text-gray-600 hover:bg-gray-50')}><span className="flex">{Array.from({ length: 5 }, (_, index) => <Star key={index} className={cn('h-3 w-3', index < rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200')} aria-hidden="true" />)}</span>{t('search.and_up', { rating })}</button>)}
        </FilterSection>

        <button type="button" onClick={() => setFilter('inStock', !filters.inStock)} className="flex min-h-11 w-full items-center justify-between rounded-lg bg-gray-50 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"><span>{t('search.in_stock_only')}</span><span className={cn('relative h-5 w-8 rounded-full transition-colors', filters.inStock ? 'bg-[#B76E79]' : 'bg-gray-300')}><span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform', filters.inStock ? 'translate-x-3.5' : 'translate-x-0.5')} /></span></button>
      </div>
    </aside>
  )
}

function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="mb-5 border-b border-[#EEEEEE] pb-4"><h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">{title}</h3><div className="space-y-1">{children}</div></section>
}

function FilterButton({ selected, onClick, label }: { selected: boolean; onClick: () => void; label: string }) {
  return <button type="button" onClick={onClick} className={cn('flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm transition-colors', selected ? 'bg-rose-50 font-semibold text-[#B76E79]' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900')}><span className="truncate">{label}</span></button>
}
