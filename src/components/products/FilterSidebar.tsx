'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, Star } from 'lucide-react'
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
    <aside className={cn('hidden w-56 shrink-0 md:block xl:w-64', className)} aria-label={t('search.filters')}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wider text-gray-900">{t('search.filters')}</h2>
        {activeFilterCount > 0 && <button type="button" onClick={clearAllFilters} className="min-h-8 px-1 text-xs font-bold text-[#B76E79]">{t('search.clear_all_filters')} ({activeFilterCount})</button>}
      </div>

      {availableCategories.length > 0 && <FilterSection title={t('nav.categories')}>
        <FilterButton selected={!filters.category} onClick={() => setFilter('category', '')} label={t('categories.all')} />
        {availableCategories.map((category) => <FilterButton key={category.id} selected={filters.category === category.slug} onClick={() => setFilter('category', filters.category === category.slug ? '' : category.slug)} label={category.name} count={category._count?.products} />)}
      </FilterSection>}

      <FilterSection title={t('search.price_range_label')}>
        {priceRanges.map((range) => {
          const selected = filters.minPrice === range.min && filters.maxPrice === range.max
          return <FilterButton key={range.label} selected={selected} onClick={() => setFilters({ minPrice: selected ? '' : range.min, maxPrice: selected ? '' : range.max })} label={range.label} />
        })}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{t('search.minimum')}<input type="number" min="0" step="500" value={filters.minPrice} onChange={(event) => setFilter('minPrice', event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-gray-200 px-2 text-sm text-gray-800 outline-none focus:border-[#B76E79]" /></label>
          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{t('search.maximum')}<input type="number" min="0" step="500" value={filters.maxPrice} onChange={(event) => setFilter('maxPrice', event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-gray-200 px-2 text-sm text-gray-800 outline-none focus:border-[#B76E79]" /></label>
        </div>
      </FilterSection>

      <FilterSection title={t('search.skin_type')}>
        {SKIN_TYPES.map((skinType) => <FilterButton key={skinType} selected={filters.skinType === skinType} onClick={() => setFilter('skinType', filters.skinType === skinType ? '' : skinType)} label={t(`skin_types.${skinType}`)} />)}
      </FilterSection>

      <FilterSection title={t('product.hair_type')} defaultOpen={false}>
        {HAIR_TYPES.map((hairType) => <FilterButton key={hairType} selected={filters.hairType === hairType} onClick={() => setFilter('hairType', filters.hairType === hairType ? '' : hairType)} label={t(`hair_types.${hairType}`)} />)}
      </FilterSection>

      {availableBrands.length > 0 && <FilterSection title={t('search.brand')}>
        {availableBrands.slice(0, 12).map((brand) => <FilterButton key={brand.id} selected={filters.brand === brand.slug} onClick={() => setFilter('brand', filters.brand === brand.slug ? '' : brand.slug)} label={brand.name} />)}
      </FilterSection>}

      <FilterSection title={t('product.shade')} defaultOpen={false}>
        <input type="search" value={filters.shade} onChange={(event) => setFilter('shade', event.target.value)} className="min-h-10 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-[#B76E79]" aria-label={t('product.shade')} />
      </FilterSection>

      <FilterSection title={t('search.customer_rating')} defaultOpen={false}>
        {[4, 3, 2].map((rating) => <button key={rating} type="button" onClick={() => setFilter('minRating', filters.minRating === String(rating) ? '' : String(rating))} className={cn('flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-sm', filters.minRating === String(rating) ? 'bg-rose-50 font-bold text-[#B76E79]' : 'text-gray-600 hover:bg-gray-50')}><span className="flex">{Array.from({ length: 5 }, (_, index) => <Star key={index} className={cn('h-3 w-3', index < rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200')} />)}</span>{t('search.and_up', { rating })}</button>)}
      </FilterSection>

      <button type="button" onClick={() => setFilter('inStock', !filters.inStock)} className="flex min-h-11 w-full items-center justify-between rounded-xl bg-gray-50 px-3 text-sm font-semibold text-gray-700"><span>{t('search.in_stock_only')}</span><span className={cn('relative h-5 w-8 rounded-full transition-colors', filters.inStock ? 'bg-[#B76E79]' : 'bg-gray-300')}><span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform', filters.inStock ? 'translate-x-3.5' : 'translate-x-0.5')} /></span></button>
    </aside>
  )
}

function FilterSection({ title, children, defaultOpen = true }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return <section className="mb-4 border-b border-gray-100 pb-4"><button type="button" onClick={() => setOpen((value) => !value)} className="mb-2 flex min-h-9 w-full items-center justify-between text-left text-xs font-black uppercase tracking-wider text-gray-700" aria-expanded={open}><span>{title}</span>{open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}</button>{open && <div className="space-y-1">{children}</div>}</section>
}

function FilterButton({ selected, onClick, label, count }: { selected: boolean; onClick: () => void; label: string; count?: number }) {
  return <button type="button" onClick={onClick} className={cn('flex min-h-9 w-full items-center justify-between rounded-lg px-2 text-left text-sm transition-colors', selected ? 'bg-rose-50 font-bold text-[#B76E79]' : 'text-gray-600 hover:bg-gray-50')}><span className="truncate">{label}</span>{count !== undefined && <span className="ml-2 text-xs text-gray-400">{count}</span>}</button>
}
