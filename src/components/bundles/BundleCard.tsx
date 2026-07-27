'use client'

import Image from 'next/image'
import Link from 'next/link'
import { AlertCircle, Package } from 'lucide-react'
import { getCloudinaryUrl } from '@/lib/cloudinary-images'
import { formatRWF } from '@/lib/format'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export interface BundleCardData {
  id: string; name: string; nameRw?: string | null; slug: string; description?: string | null; descriptionRw?: string | null
  bundlePrice: number; normalTotal: number; savings: number; savingsPercent: number; isInStock: boolean; maxQuantity: number
  coverImage?: string | null; coverImageUrl?: string | null; bundleType: string; isFeatured?: boolean
  products: Array<{ id: string; stepOrder: number; stepLabel?: string | null; stepLabelRw?: string | null; quantity: number; isOptional: boolean; isInStock: boolean; product: { id: string; name: string; slug: string; price: number; stock: number; volume?: string | null; images?: string[]; productImages?: Array<{ url: string; publicId: string; altText: string; altTextRw?: string | null }> } }>
}

export default function BundleCard({ bundle }: { bundle: BundleCardData }) {
  const { t, language } = useLanguage()
  const name = language === 'rw' && bundle.nameRw ? bundle.nameRw : bundle.name
  const description = language === 'rw' && bundle.descriptionRw ? bundle.descriptionRw : bundle.description
  const cover = bundle.coverImage ? getCloudinaryUrl(bundle.coverImage, 'CARD_TABLET') : bundle.coverImageUrl
  const preview = bundle.products.slice(0, 3)
  return <article className="w-[84vw] max-w-sm flex-none snap-start overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm md:w-auto md:max-w-none">
    <div className="relative h-44 bg-gray-50">
      {cover ? <Image src={cover} alt={name} fill sizes="(max-width: 768px) 84vw, 380px" loading="lazy" className="object-cover" /> : <div className="grid h-full grid-cols-3 gap-1 p-3">{preview.map((item) => { const image = item.product.productImages?.[0]; const url = image?.publicId ? getCloudinaryUrl(image.publicId, 'THUMBNAIL') : image?.url || item.product.images?.[0]; return <span key={item.id} className="relative overflow-hidden rounded-xl bg-white">{url && <Image src={url} alt={language === 'rw' && image?.altTextRw ? image.altTextRw : image?.altText || item.product.name} fill sizes="110px" loading="lazy" className="object-contain p-1" />}</span>})}</div>}
      <span className="absolute left-3 top-3 rounded-full bg-[#B76E79] px-2.5 py-1 text-xs font-bold text-white">{t(`bundles.type_${bundle.bundleType.toLowerCase()}`)}</span>
      {!bundle.isInStock && <span className="absolute inset-0 grid place-items-center bg-white/75"><strong className="rounded-full bg-gray-900 px-4 py-2 text-xs text-white">{t('common.sold_out')}</strong></span>}
    </div>
    <div className="p-4"><h2 className="font-black text-gray-900">{name}</h2>{description && <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-500">{description}</p>}
      <div className="mt-3 space-y-1">{bundle.products.slice(0, 4).map((item, index) => <p key={item.id} className="flex items-center gap-2 text-xs text-gray-600"><span className="grid h-5 w-5 place-items-center rounded-full bg-rose-50 font-bold text-[#B76E79]">{item.stepOrder || index + 1}</span><span className="truncate">{language === 'rw' && item.stepLabelRw ? item.stepLabelRw : item.stepLabel || item.product.name}</span>{!item.isInStock && <AlertCircle className="ml-auto h-3.5 w-3.5 text-red-500" />}</p>)}</div>
      <div className="mt-4 rounded-xl bg-gray-50 p-3 text-sm"><p className="flex justify-between text-gray-500"><span>{t('bundles.normal_total')}</span><span>{formatRWF(bundle.normalTotal)}</span></p>{bundle.savings > 0 ? <p className="mt-1 flex justify-between font-bold text-emerald-700"><span>{t('bundles.you_save')}</span><span>{formatRWF(bundle.savings)} ({bundle.savingsPercent}%)</span></p> : bundle.savings < 0 ? <p className="mt-1 flex justify-between font-bold text-amber-700"><span>{t('bundles.additional_cost')}</span><span>{formatRWF(Math.abs(bundle.savings))}</span></p> : null}<p className="mt-2 flex items-center justify-between border-t border-gray-200 pt-2 font-black"><span>{t('bundles.bundle_price')}</span><span className="text-lg text-[#B76E79]">{formatRWF(bundle.bundlePrice)}</span></p></div>
      {!bundle.isInStock && <p className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-2 text-xs text-red-700"><AlertCircle className="h-4 w-4" />{t('bundles.out_of_stock')}</p>}
      <Link href={`/bundles/${bundle.slug}`} className={`mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl text-sm font-bold ${bundle.isInStock ? 'bg-[#B76E79] text-white' : 'bg-gray-200 text-gray-600'}`}><Package className="h-4 w-4" />{t('bundles.view_bundle')}</Link>
    </div>
  </article>
}
