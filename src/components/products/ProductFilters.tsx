'use client'

import { RotateCcw, Star } from 'lucide-react'
import type { Brand, Category } from '@/lib/types'
import { useT } from '@/lib/i18n/LanguageContext'

export interface ProductFilterState {
  category: string
  brand: string
  minPrice: string
  maxPrice: string
  skinType: string
  minRating: string
  inStock: boolean
}

interface ProductFiltersProps {
  filters: ProductFilterState
  categories: Category[]
  brands: Brand[]
  loading?: boolean
  onChange: (filters: ProductFilterState) => void
  onClear: () => void
}

const skinTypes = ['OILY', 'DRY', 'COMBINATION', 'SENSITIVE', 'NORMAL']

export default function ProductFilters({ filters, categories, brands, loading = false, onChange, onClear }: ProductFiltersProps) {
  const t = useT()
  const update = <K extends keyof ProductFilterState>(key: K, value: ProductFilterState[K]) => onChange({ ...filters, [key]: value })
  const activeCount = Object.entries(filters).filter(([key, value]) => key === 'inStock' ? value : Boolean(value)).length

  if (loading) return <div className="space-y-5">{[120, 160, 100, 140].map((height, index) => <div key={index} className="animate-pulse rounded-xl bg-gray-100" style={{ height }} />)}</div>

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between"><h2 className="text-sm font-black uppercase tracking-[0.16em] text-[#1a1a1a]">{t('search.filters')} {activeCount > 0 && <span className="ml-1 rounded-full bg-[#B76E79] px-2 py-0.5 text-[10px] text-white">{activeCount}</span>}</h2>{activeCount > 0 && <button type="button" onClick={onClear} className="flex items-center gap-1 text-xs font-bold text-[#B76E79]"><RotateCcw className="h-3.5 w-3.5" />{t('search.reset')}</button>}</div>

      <FilterGroup title={t('search.category')}>
        <RadioButton active={!filters.category} onClick={() => update('category', '')}>{t('categories.all')}</RadioButton>
        {categories.map((category) => <RadioButton key={category.id} active={filters.category === category.slug} onClick={() => update('category', category.slug)}>{category.name}<span className="ml-auto text-[10px] text-gray-400">{category._count?.products ?? ''}</span></RadioButton>)}
      </FilterGroup>

      {brands.length > 0 && <FilterGroup title={t('search.brand')}><select value={filters.brand} onChange={(event) => update('brand', event.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-[#B76E79]"><option value="">{t('search.all_brands')}</option>{brands.map((brand) => <option key={brand.id} value={brand.slug}>{brand.name}</option>)}</select></FilterGroup>}

      <FilterGroup title={t('search.price_range_label')}><div className="grid grid-cols-2 gap-2"><label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{t('search.minimum')}<input type="number" min="0" step="500" value={filters.minPrice} onChange={(event) => update('minPrice', event.target.value)} placeholder="0" className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:border-[#B76E79]" /></label><label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{t('search.maximum')}<input type="number" min="0" step="500" value={filters.maxPrice} onChange={(event) => update('maxPrice', event.target.value)} placeholder="50,000" className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:border-[#B76E79]" /></label></div></FilterGroup>

      <FilterGroup title={t('search.skin_type')}><div className="flex flex-wrap gap-2">{skinTypes.map((skin) => <button key={skin} type="button" onClick={() => update('skinType', filters.skinType === skin ? '' : skin)} className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${filters.skinType === skin ? 'border-[#B76E79] bg-[#B76E79] text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-rose-200'}`}>{t(`skin_types.${skin}`)}</button>)}</div></FilterGroup>

      <FilterGroup title={t('search.customer_rating')}><div className="space-y-1">{['4.5', '4', '3'].map((rating) => <button key={rating} type="button" onClick={() => update('minRating', filters.minRating === rating ? '' : rating)} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm ${filters.minRating === rating ? 'bg-rose-50 font-bold text-[#B76E79]' : 'text-gray-600 hover:bg-gray-50'}`}><span className="flex">{[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`h-3.5 w-3.5 ${star <= Math.round(Number(rating)) ? 'fill-[#FFD700] text-[#FFD700]' : 'fill-gray-200 text-gray-200'}`} />)}</span>{t('search.and_up', { rating })}</button>)}</div></FilterGroup>

      <label className="flex cursor-pointer items-center justify-between rounded-xl bg-[#f8f9fa] p-3 text-sm font-semibold text-gray-700"><span>{t('search.in_stock_only')}</span><input type="checkbox" checked={filters.inStock} onChange={(event) => update('inStock', event.target.checked)} className="h-5 w-5 rounded border-gray-300 text-[#B76E79] focus:ring-[#B76E79]" /></label>
    </div>
  )
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h3 className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-gray-500">{title}</h3><div className="space-y-1">{children}</div></section>
}

function RadioButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition-colors ${active ? 'bg-[#B76E79] font-bold text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-[#1a1a1a]'}`}>{children}</button>
}
