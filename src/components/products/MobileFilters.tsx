'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Filter, Star, X } from 'lucide-react'
import type { Brand, Category } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n/LanguageContext'
import { DEFAULT_PRODUCT_FILTERS, type ProductFilters, useProductFilters } from '@/hooks/useProductFilters'
import { useFacets } from '@/hooks/use-facets'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

interface MobileFiltersProps {
  availableCategories: Category[]
  availableBrands: Brand[]
}

const SKIN_TYPES = ['OILY', 'DRY', 'COMBINATION', 'NORMAL', 'SENSITIVE'] as const
const HAIR_TYPES = ['NATURAL', 'RELAXED', 'WAVY', 'CURLY', 'COILY', 'ALL_HAIR'] as const

export default function MobileFilters({ availableCategories, availableBrands }: MobileFiltersProps) {
  const t = useT()
  const { filters, activeFilterCount, setFilters } = useProductFilters()
  // Same live counts the desktop sidebar uses. Hair type, rating and shade
  // are empty across all 106 products, so those 10 controls are not rendered.
  const { countFor, showRating, showHairType, showShade, showBrand } = useFacets()
  const [open, setOpen] = useState(false)
  const [localFilters, setLocalFilters] = useState<ProductFilters>(filters)
  const touchStartY = useRef(0)

  useEffect(() => {
    if (open) setLocalFilters(filters)
  }, [filters, open])

  const localActiveCount = useMemo(() => [
    localFilters.category, localFilters.brand, localFilters.minPrice, localFilters.maxPrice,
    localFilters.skinType, localFilters.hairType, localFilters.inStock,
    localFilters.shade, localFilters.minRating,
  ].filter(Boolean).length, [localFilters])

  const update = <K extends keyof ProductFilters>(key: K, value: ProductFilters[K]) => {
    setLocalFilters((current) => ({ ...current, [key]: value }))
  }

  /**
   * Result count for the filters currently selected IN THE SHEET.
   *
   * `facets.total` cannot be used here: the sheet edits a local copy that has
   * not been applied yet, so facets.total still describes the previous query.
   * Labelling the button "Apply (44 results)" while the pending selection
   * actually yields 3 would be worse than showing no number at all.
   *
   * Debounced, aborted on change, and it fails silently — the button keeps
   * working without a count if the probe fails.
   */
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const previewAbort = useRef<AbortController | null>(null)
  useEffect(() => {
    if (!open) return
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(localFilters)) {
      if (key === 'page') continue
      if (value === '' || value === false || (key === 'sort' && value === 'relevance')) continue
      params.set(key, String(value))
    }
    params.set('limit', '1')
    const timer = window.setTimeout(() => {
      previewAbort.current?.abort()
      const controller = new AbortController()
      previewAbort.current = controller
      fetch(`/api/products?${params.toString()}`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload) => {
          if (controller.signal.aborted) return
          const total = payload?.pagination?.total
          setPreviewCount(typeof total === 'number' ? total : null)
        })
        .catch(() => { if (!previewAbort.current?.signal.aborted) setPreviewCount(null) })
    }, 250)
    return () => {
      window.clearTimeout(timer)
      previewAbort.current?.abort()
    }
  }, [localFilters, open])
  const apply = () => {
    setFilters(localFilters)
    setOpen(false)
  }
  const clear = () => {
    setLocalFilters((current) => ({ ...DEFAULT_PRODUCT_FILTERS, search: current.search }))
  }

  const priceRanges = [
    { label: t('search.price_under', { price: '5,000' }), min: '', max: '5000' },
    { label: t('search.price_under', { price: '10,000' }), min: '', max: '10000' },
    { label: t('search.price_range', { min: '10,000', max: '30,000' }), min: '10000', max: '30000' },
    { label: t('search.price_range', { min: '30,000', max: '50,000' }), min: '30000', max: '50000' },
    { label: '50,000 RWF+', min: '50000', max: '' },
  ]
  const sortOptions = [
    { value: 'relevance', label: t('search.sort_relevance') },
    { value: 'best_selling', label: t('search.sort_best_selling') },
    { value: 'newest', label: t('search.sort_newest') },
    { value: 'price_asc', label: t('search.sort_price_low') },
    { value: 'price_desc', label: t('search.sort_price_high') },
    { value: 'rating', label: t('search.sort_top_rated') },
  ]

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button type="button" className="relative flex min-h-11 items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 lg:hidden" aria-label={t('search.filters')}>
          <Filter className="h-4 w-4" />{t('search.filters')}
          {activeFilterCount > 0 && <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-fcs-brand-strong px-1 text-xs text-white">{activeFilterCount}</span>}
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[90vh] gap-0 rounded-t-3xl bg-white p-0 lg:hidden"
        onTouchStart={(event) => { touchStartY.current = event.touches[0]?.clientY || 0 }}
        onTouchEnd={(event) => { if ((event.changedTouches[0]?.clientY || 0) - touchStartY.current > 80) setOpen(false) }}
      >
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-gray-200" />
        <SheetHeader className="border-b border-gray-100 px-5 py-3 text-left">
          <div className="flex items-center justify-between pr-8"><SheetTitle>{t('search.filters')}</SheetTitle>{localActiveCount > 0 && <button type="button" onClick={clear} className="min-h-9 px-2 text-sm font-semibold text-fcs-brand-text">{t('search.clear_all_filters')}</button>}</div>
          <SheetDescription>{t('search.filters_active', { count: localActiveCount })}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
          <FilterSection title={t('search.sort_by')}>
            {sortOptions.map((option) => <ChoiceRow key={option.value} selected={localFilters.sort === option.value} onClick={() => update('sort', option.value)} label={option.label} />)}
          </FilterSection>

          <FilterSection title={t('search.price_range_label')}>
            {priceRanges.map((range) => { const selected = localFilters.minPrice === range.min && localFilters.maxPrice === range.max; return <ChoiceRow key={range.label} selected={selected} onClick={() => setLocalFilters((current) => ({ ...current, minPrice: selected ? '' : range.min, maxPrice: selected ? '' : range.max }))} label={range.label} /> })}
          </FilterSection>

          {availableCategories.length > 0 && <FilterSection title={t('nav.categories')}>
            {availableCategories.map((category) => <ChoiceRow key={category.id} selected={localFilters.category === category.slug} onClick={() => update('category', localFilters.category === category.slug ? '' : category.slug)} label={category.name} count={countFor.category(category.slug)} />)}
          </FilterSection>}

          {showBrand && availableBrands.length > 0 && <FilterSection title={t('search.brand')}>
            <div className="flex flex-wrap gap-2">{availableBrands.slice(0, 12).map((brand) => <Pill key={brand.id} selected={localFilters.brand === brand.slug} onClick={() => update('brand', localFilters.brand === brand.slug ? '' : brand.slug)} count={countFor.brand(brand.slug)}>{brand.name}</Pill>)}</div>
          </FilterSection>}

          <FilterSection title={t('search.skin_type')}>
            <div className="flex flex-wrap gap-2">{SKIN_TYPES.map((skinType) => <Pill key={skinType} selected={localFilters.skinType === skinType} onClick={() => update('skinType', localFilters.skinType === skinType ? '' : skinType)} count={countFor.skinType(skinType)}>{t(`skin_types.${skinType}`)}</Pill>)}</div>
          </FilterSection>

          {showHairType && <FilterSection title={t('product.hair_type')}>
            <div className="flex flex-wrap gap-2">{HAIR_TYPES.map((hairType) => <Pill key={hairType} selected={localFilters.hairType === hairType} onClick={() => update('hairType', localFilters.hairType === hairType ? '' : hairType)} count={countFor.hairType(hairType)}>{t(`hair_types.${hairType}`)}</Pill>)}</div>
          </FilterSection>}

          {showShade && <FilterSection title={t('product.shade')}>
            <input value={localFilters.shade} onChange={(event) => update('shade', event.target.value)} className="min-h-11 w-full rounded-xl border border-gray-200 px-3 text-base outline-none focus:border-fcs-brand" aria-label={t('product.shade')} />
          </FilterSection>}

          {showRating && <FilterSection title={t('search.customer_rating')}>
            {[4, 3, 2].map((rating) => <button key={rating} type="button" onClick={() => update('minRating', localFilters.minRating === String(rating) ? '' : String(rating))} className={cn('flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-sm', localFilters.minRating === String(rating) ? 'bg-rose-50 font-bold text-fcs-brand-text' : 'text-gray-700')}><span className="flex">{Array.from({ length: 5 }, (_, index) => <Star key={index} className={cn('h-3.5 w-3.5', index < rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200')} />)}</span>{t('search.and_up', { rating })}</button>)}
          </FilterSection>}

          <button type="button" onClick={() => update('inStock', !localFilters.inStock)} className="flex min-h-12 w-full items-center justify-between rounded-xl bg-gray-50 px-3 text-sm font-semibold text-gray-700"><span>{t('search.in_stock_only')}</span><span className={cn('relative h-6 w-10 rounded-full transition-colors', localFilters.inStock ? 'bg-fcs-brand' : 'bg-gray-300')}><span className={cn('absolute top-1 h-4 w-4 rounded-full bg-white transition-transform', localFilters.inStock ? 'translate-x-5' : 'translate-x-1')} /></span></button>
        </div>

        <SheetFooter className="sticky bottom-0 border-t border-gray-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button type="button" onClick={apply} className="min-h-[52px] w-full rounded-2xl bg-fcs-brand-strong text-base font-black text-white disabled:opacity-60" disabled={previewCount === 0}>
            {previewCount === 0
              ? t('search.no_filter_results')
              : `${t('common.apply')}${previewCount !== null ? ` (${t('search.products_found', { count: previewCount })})` : ''}`}
          </button>
          <SheetClose asChild><button type="button" className="min-h-11 w-full rounded-xl text-sm font-semibold text-gray-600"><X className="mr-1 inline h-4 w-4" />{t('common.close')}</button></SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h3 className="mb-2 text-xs font-black uppercase tracking-wider text-gray-500">{title}</h3><div className="space-y-1">{children}</div></section>
}

function ChoiceRow({ selected, onClick, label, count }: { selected: boolean; onClick: () => void; label: string; count?: number }) {
  const empty = count === 0
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={empty && !selected}
      aria-disabled={empty && !selected}
      className={cn(
        'flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3 text-left text-sm',
        selected ? 'bg-rose-50 font-bold text-fcs-brand-text' : 'text-gray-700 hover:bg-gray-50',
        empty && !selected && 'cursor-not-allowed opacity-40 hover:bg-transparent',
      )}
    >
      <span className="truncate">{label}</span>
      <span className="flex shrink-0 items-center gap-2">
        {count !== undefined && <span className="text-xs tabular-nums text-fcs-text-muted">{count}</span>}
        {selected && <Check className="h-4 w-4" />}
      </span>
    </button>
  )
}

function Pill({ selected, onClick, children, count }: { selected: boolean; onClick: () => void; children: React.ReactNode; count?: number }) {
  const empty = count === 0
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={empty && !selected}
      aria-disabled={empty && !selected}
      className={cn(
        'min-h-10 rounded-xl border-2 px-3 text-sm font-semibold',
        selected ? 'border-fcs-brand bg-rose-50 text-fcs-brand-text' : 'border-gray-200 text-gray-700',
        empty && !selected && 'cursor-not-allowed opacity-40',
      )}
    >
      {children}
      {count !== undefined && <span className="ml-1.5 text-xs tabular-nums text-fcs-text-muted">{count}</span>}
    </button>
  )
}
