'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, Check, Loader2, Package, ShoppingCart } from 'lucide-react'
import { getCloudinaryUrl } from '@/lib/cloudinary-images'
import { formatRWF } from '@/lib/format'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useStore } from '@/store/useStore'
import { useToast } from '@/hooks/use-toast'
import type { BundleCardData } from '@/components/bundles/BundleCard'

interface BundleDetail extends BundleCardData {
  usageInstructions?: string | null
  usageInstructionsRw?: string | null
  outOfStockProducts: Array<{ name: string; stockAvailable: number; quantityNeeded: number }>
}

export default function BundleDetailView({ slug }: { slug: string }) {
  const { t, language } = useLanguage()
  const addToCart = useStore((state) => state.addToCart)
  const { toast } = useToast()
  const [bundle, setBundle] = useState<BundleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(false)
    fetch(`/api/bundles/${encodeURIComponent(slug)}`, { signal: controller.signal, cache: 'no-store' })
      .then((response) => { if (!response.ok) throw new Error(); return response.json() })
      .then((result) => setBundle(result.data || null))
      .catch((reason) => { if (!(reason instanceof DOMException && reason.name === 'AbortError')) setError(true) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [slug])

  if (loading) return <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[#B76E79]" /></div>
  if (error || !bundle) return <div className="mx-auto max-w-2xl px-4 py-16 text-center"><p className="font-bold text-gray-800">{t('bundles.not_found')}</p><Link href="/bundles" className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-[#B76E79] px-5 font-bold text-white">{t('bundles.all_bundles')}</Link></div>

  const name = language === 'rw' && bundle.nameRw ? bundle.nameRw : bundle.name
  const description = language === 'rw' && bundle.descriptionRw ? bundle.descriptionRw : bundle.description
  const usage = language === 'rw' && bundle.usageInstructionsRw ? bundle.usageInstructionsRw : bundle.usageInstructions
  const cover = bundle.coverImage ? getCloudinaryUrl(bundle.coverImage, 'DETAIL_MOBILE') : bundle.coverImageUrl
  const firstProductImage = bundle.products[0]?.product.productImages?.[0]
  const cartImage = cover || (firstProductImage?.publicId ? getCloudinaryUrl(firstProductImage.publicId, 'CARD_MOBILE') : firstProductImage?.url || bundle.products[0]?.product.images?.[0] || '')

  const add = () => {
    if (!bundle.isInStock || bundle.maxQuantity < 1) return
    addToCart({ productId: `bundle:${bundle.id}`, bundleId: bundle.id, isBundle: true, slug: bundle.slug, name, price: bundle.bundlePrice, image: cartImage, stock: bundle.maxQuantity })
    toast({ title: t('bundles.added_to_cart'), description: name })
  }

  return <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
    <Link href="/bundles" className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-gray-600"><ArrowLeft className="h-4 w-4" />{t('bundles.all_bundles')}</Link>
    {cover && <div className="relative mb-6 aspect-[16/9] overflow-hidden rounded-3xl bg-gray-50"><Image src={cover} alt={name} fill priority sizes="(max-width: 900px) 100vw, 900px" className="object-cover" /></div>}
    <h1 className="text-3xl font-black text-gray-900">{name}</h1>{description && <p className="mt-3 leading-7 text-gray-600">{description}</p>}

    <section className="mt-8"><h2 className="flex items-center gap-2 text-lg font-black"><Package className="h-5 w-5 text-[#B76E79]" />{t('bundles.products_included', { count: bundle.products.length })}</h2><div className="mt-4 space-y-3">{bundle.products.map((item, index) => { const image = item.product.productImages?.[0]; const imageUrl = image?.publicId ? getCloudinaryUrl(image.publicId, 'THUMBNAIL') : image?.url || item.product.images?.[0]; return <article key={item.id} className={`flex items-center gap-3 rounded-2xl border p-3 ${item.isInStock ? 'border-gray-100 bg-white' : 'border-red-200 bg-red-50'}`}><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#B76E79] text-sm font-bold text-white">{item.stepOrder || index + 1}</span><span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-50">{imageUrl && <Image src={imageUrl} alt={language === 'rw' && image?.altTextRw ? image.altTextRw : image?.altText || item.product.name} fill sizes="64px" loading="lazy" className="object-contain p-1" />}</span><div className="min-w-0 flex-1"><p className="text-xs font-bold text-[#B76E79]">{language === 'rw' && item.stepLabelRw ? item.stepLabelRw : item.stepLabel}</p><Link href={`/products/${item.product.slug}`} className="line-clamp-2 text-sm font-bold text-gray-900">{item.product.name}</Link><p className="text-xs text-gray-500">{item.quantity > 1 ? `${item.quantity} × ` : ''}{formatRWF(item.product.price)}</p>{item.isOptional && <p className="text-xs italic text-gray-400">{t('bundles.optional')}</p>}</div><span className={`flex shrink-0 items-center gap-1 text-xs font-bold ${item.isInStock ? 'text-emerald-700' : 'text-red-600'}`}>{item.isInStock ? <Check className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}{item.isInStock ? t('bundles.in_stock') : t('common.sold_out')}</span></article>})}</div></section>

    {usage && <section className="mt-7"><h2 className="text-lg font-black">{t('bundles.usage_title')}</h2><p className="mt-3 whitespace-pre-line rounded-2xl border border-rose-100 bg-rose-50/50 p-4 text-sm leading-7 text-gray-700">{usage}</p></section>}

    <section className="mt-7 rounded-2xl bg-gray-50 p-5"><h2 className="font-black">{t('bundles.pricing_breakdown')}</h2>{bundle.products.map((item) => <p key={item.id} className="mt-2 flex justify-between gap-4 text-sm text-gray-600"><span className="truncate">{item.product.name}{item.quantity > 1 ? ` × ${item.quantity}` : ''}</span><span>{formatRWF(item.product.price * item.quantity)}</span></p>)}<div className="mt-3 space-y-2 border-t border-gray-200 pt-3"><p className="flex justify-between text-sm"><span>{t('bundles.normal_total')}</span><span>{formatRWF(bundle.normalTotal)}</span></p>{bundle.savings > 0 ? <p className="flex justify-between text-sm font-bold text-emerald-700"><span>{t('bundles.you_save')}</span><span>{formatRWF(bundle.savings)} ({bundle.savingsPercent}%)</span></p> : bundle.savings < 0 ? <p className="flex justify-between text-sm font-bold text-amber-700"><span>{t('bundles.additional_cost')}</span><span>{formatRWF(Math.abs(bundle.savings))}</span></p> : null}<p className="flex justify-between border-t border-gray-200 pt-3 font-black"><span>{t('bundles.bundle_price')}</span><span className="text-2xl text-[#B76E79]">{formatRWF(bundle.bundlePrice)}</span></p></div></section>

    {!bundle.isInStock && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4"><p className="font-bold text-red-700">{t('bundles.out_of_stock')}</p>{bundle.outOfStockProducts.map((item) => <p key={item.name} className="mt-1 text-xs text-red-600">{item.name}: {item.stockAvailable}/{item.quantityNeeded}</p>)}</div>}
    <button type="button" onClick={add} disabled={!bundle.isInStock} className="sticky bottom-[calc(68px+env(safe-area-inset-bottom))] mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#B76E79] px-5 text-base font-black text-white shadow-lg disabled:bg-gray-300 md:bottom-6"><ShoppingCart className="h-5 w-5" />{bundle.isInStock ? t('bundles.add_to_cart', { price: formatRWF(bundle.bundlePrice) }) : t('common.sold_out')}</button>
  </main>
}
