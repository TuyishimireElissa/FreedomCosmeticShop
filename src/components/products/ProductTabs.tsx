'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FlaskConical,
  Leaf,
  MapPin,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react'
import type { Product } from '@/lib/types'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import DeliveryEstimator from '@/components/products/DeliveryEstimator'
import ProductReviews from '@/components/reviews/ProductReviews'

type Tab = 'description' | 'ingredients' | 'howToUse' | 'results' | 'authenticity' | 'reviews' | 'delivery'

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim())
}

function splitLocalizedIngredients(value: string) {
  return value.split(/\r?\n|,|;/).map((item) => item.trim()).filter(Boolean)
}

export default function ProductTabs({ product }: { product: Product }) {
  const { t, isRW } = useLanguage()
  const [active, setActive] = useState<Tab>('description')

  const description = product.description
  const howToUse = isRW && hasText(product.howToUseRw)
    ? product.howToUseRw
    : product.howToUse || product.usageInstructions
  const warnings = isRW && hasText(product.warningsRw) ? product.warningsRw : product.warnings
  const expectedResults = isRW && hasText(product.expectedResultsRw)
    ? product.expectedResultsRw
    : product.expectedResults
  const ingredients = isRW && hasText(product.ingredientsRw)
    ? splitLocalizedIngredients(product.ingredientsRw as string)
    : product.ingredients || []

  const tabs = useMemo<Array<{ id: Tab; label: string }>>(() => {
    const available: Array<{ id: Tab; label: string }> = []
    if (hasText(description) || product.skinType?.length || product.hairType || hasText(product.volume) || product.fragranceNotes) {
      available.push({ id: 'description', label: t('product.description') })
    }
    if (ingredients.length || product.allergens?.length) {
      available.push({ id: 'ingredients', label: t('product.ingredients') })
    }
    if (hasText(howToUse) || hasText(warnings) || product.periodAfterOpening) {
      available.push({ id: 'howToUse', label: t('product.how_to_use') })
    }
    if (hasText(expectedResults) || hasText(product.resultsTimeframe)) {
      available.push({ id: 'results', label: t('product.expected_results') })
    }
    available.push({ id: 'authenticity', label: t('product.authenticity') })
    available.push({ id: 'reviews', label: t('product.reviews') })
    available.push({ id: 'delivery', label: t('product.delivery') })
    return available
  }, [description, expectedResults, howToUse, ingredients.length, product, t, warnings])

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === active)) setActive(tabs[0]?.id || 'delivery')
  }, [active, tabs])

  const fragranceGroups = product.fragranceNotes
    ? [
        [t('product.fragrance_top'), product.fragranceNotes.top],
        [t('product.fragrance_middle'), product.fragranceNotes.middle],
        [t('product.fragrance_base'), product.fragranceNotes.base],
      ].filter((entry): entry is [string, string[]] => Array.isArray(entry[1]) && entry[1].length > 0)
    : []

  return (
    <section className="mt-12 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="scrollbar-hide flex overflow-x-auto border-b border-gray-100 px-2 sm:px-5" role="tablist" aria-label={t('product.product_information')}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`product-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            aria-controls={`product-panel-${tab.id}`}
            tabIndex={active === tab.id ? 0 : -1}
            onClick={() => setActive(tab.id)}
            className={`shrink-0 border-b-2 px-4 py-4 text-sm font-bold transition-colors ${active === tab.id ? 'border-[#B76E79] text-[#B76E79]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div id={`product-panel-${active}`} role="tabpanel" aria-labelledby={`product-tab-${active}`} className="p-5 sm:p-7">
        {active === 'description' && (
          <div className="text-gray-600">
            {hasText(description) && <><h2 className="text-lg font-bold text-[#1a1a1a]">{t('product.about_product', { product: product.name })}</h2><p className="mt-3 whitespace-pre-line leading-7">{description}</p></>}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {hasText(product.volume) && <Detail label={t('product.volume')} value={product.volume as string} />}
              {product.skinType?.length ? <Detail label={t('product.skin_type')} value={product.skinType.map((value) => t(`skin_types.${value}`)).join(', ')} /> : null}
              {product.hairType && <Detail label={t('product.hair_type')} value={t(`hair_types.${product.hairType}`)} />}
            </div>
            {fragranceGroups.length > 0 && <div className="mt-6"><h3 className="flex items-center gap-2 font-bold text-gray-800"><Leaf className="h-4 w-4 text-[#B76E79]" />{t('product.fragrance_notes')}</h3><div className="mt-3 grid gap-3 sm:grid-cols-3">{fragranceGroups.map(([label, notes]) => <Detail key={label} label={label} value={notes.join(', ')} />)}</div></div>}
          </div>
        )}

        {active === 'ingredients' && (
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-[#1a1a1a]"><FlaskConical className="h-5 w-5 text-[#B76E79]" />{t('product.ingredients')}</h2>
            {ingredients.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{ingredients.map((ingredient, index) => <span key={`${ingredient}-${index}`} className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-[#9e5964]">{ingredient}</span>)}</div>}
            <p className="mt-4 text-xs leading-5 text-gray-500">{t('product.ingredients_inci_note')}</p>
            {product.allergens?.length ? <div className="mt-5 rounded-xl bg-amber-50 p-4"><h3 className="font-bold text-amber-900">{t('product.allergens')}</h3><p className="mt-1 text-sm leading-6 text-amber-800">{product.allergens.join(', ')}</p></div> : null}
          </div>
        )}

        {active === 'howToUse' && (
          <div>
            <h2 className="text-lg font-bold text-[#1a1a1a]">{t('product.how_to_use')}</h2>
            {hasText(howToUse) && <p className="mt-3 whitespace-pre-line leading-7 text-gray-600">{howToUse}</p>}
            {product.periodAfterOpening && <div className="mt-5 flex gap-3 rounded-xl bg-blue-50 p-4 text-blue-900"><Clock3 className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="text-sm font-bold">{t('product.period_after_opening')}</p><p className="mt-1 text-sm">{t('product.use_within', { months: product.periodAfterOpening })}</p></div></div>}
            {hasText(warnings) && <div className="mt-5 flex gap-3 rounded-xl bg-amber-50 p-4 text-amber-900"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="text-sm font-bold">{t('product.warnings')}</p><p className="mt-1 whitespace-pre-line text-sm leading-6">{warnings}</p></div></div>}
          </div>
        )}

        {active === 'results' && (
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-[#1a1a1a]"><Sparkles className="h-5 w-5 text-[#B76E79]" />{t('product.expected_results')}</h2>
            {hasText(expectedResults) && <p className="mt-3 whitespace-pre-line leading-7 text-gray-600">{expectedResults}</p>}
            {hasText(product.resultsTimeframe) && <p className="mt-4 rounded-xl bg-rose-50 p-4 text-sm font-semibold text-[#8d4f59]">{t('product.results_timeframe')}: {product.resultsTimeframe}</p>}
            <div className="mt-5 rounded-xl border border-gray-100 bg-[#FAFAFA] p-4"><p className="text-sm font-bold text-gray-800">{t('product.results_disclaimer')}</p><p className="mt-1 text-xs leading-5 text-gray-600">{t('product.results_disclaimer_text')}</p></div>
          </div>
        )}

        {active === 'authenticity' && (
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-[#1a1a1a]"><ShieldCheck className={`h-5 w-5 ${product.isAuthentic ? 'text-emerald-600' : 'text-gray-500'}`} />{t('product.authenticity')}</h2>
            {product.isAuthentic ? <div className="mt-4 flex gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-900"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-bold">{t('product.authenticity_verified')}</p>{hasText(product.authenticityInfo) && <p className="mt-1 whitespace-pre-line text-sm leading-6">{product.authenticityInfo}</p>}</div></div> : <div className="mt-4 rounded-xl bg-[#FAFAFA] p-4 text-gray-700"><p className="font-bold">{t('product.authenticity_not_verified')}</p><p className="mt-1 text-sm leading-6">{t('product.authenticity_not_verified_detail')}</p></div>}
            {(hasText(product.countryOfOrigin) || hasText(product.importedBy)) && <div className="mt-5 grid gap-3 sm:grid-cols-2">{hasText(product.countryOfOrigin) && <Detail label={t('product.country_of_origin')} value={product.countryOfOrigin as string} icon={<MapPin className="h-4 w-4" />} />}{hasText(product.importedBy) && <Detail label={t('product.imported_by')} value={product.importedBy as string} />}</div>}
          </div>
        )}

        {active === 'reviews' && <ProductReviews productId={product.id} productSlug={product.slug} />}

        {active === 'delivery' && <div><h2 className="flex items-center gap-2 text-lg font-bold text-[#1a1a1a]"><Truck className="h-5 w-5 text-[#B76E79]" />{t('product.delivery_across_rwanda')}</h2><p className="mt-2 text-sm leading-6 text-gray-600">{t('product.delivery_exact_fee')}</p><div className="mt-5"><DeliveryEstimator orderTotal={product.price} /></div><p className="mt-4 text-xs leading-5 text-gray-500">{t('product.return_policy_short')}</p></div>}
      </div>
    </section>
  )
}

function Detail({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return <div className="rounded-xl bg-[#f8f9fa] p-4"><p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">{icon}{label}</p><p className="mt-1.5 text-sm font-semibold leading-6 text-gray-800">{value}</p></div>
}
