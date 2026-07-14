'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageContext'

interface ProductImagesProps {
  images: string[]
  productName: string
  discount?: number
  outOfStock?: boolean
}

export default function ProductImages({ images, productName, discount = 0, outOfStock = false }: ProductImagesProps) {
  const t = useT()
  const [active, setActive] = useState(0)
  const safeImages = images.filter(Boolean)
  const current = safeImages[active]

  const move = (direction: number) => setActive((index) => (index + direction + safeImages.length) % safeImages.length)

  return (
    <div className="space-y-3">
      <div className="group relative aspect-square overflow-hidden rounded-3xl border border-gray-100 bg-[#f8f9fa] shadow-sm">
        {current ? <img src={current} alt={t('product.image_number', { product: productName, number: active + 1 })} className={`h-full w-full object-cover transition-transform duration-500 md:group-hover:scale-110 ${outOfStock ? 'opacity-60' : ''}`} /> : <div className="grid h-full place-items-center text-sm text-gray-400">{t('product.no_image_available')}</div>}
        {discount > 0 && <span className="absolute left-4 top-4 rounded-full bg-red-500 px-3 py-1.5 text-xs font-black text-white shadow-lg">-{discount}%</span>}
        {outOfStock && <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1a1a1a]/90 px-5 py-2 text-xs font-black uppercase tracking-wider text-white">{t('product.out_of_stock_update')}</span>}
        {current && <span className="absolute bottom-4 right-4 hidden items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold text-gray-600 shadow backdrop-blur md:flex"><Maximize2 className="h-3.5 w-3.5" />{t('product.hover_zoom')}</span>}
        {safeImages.length > 1 && <><button type="button" onClick={() => move(-1)} className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-gray-800 shadow-md sm:hidden" aria-label={t('product.previous_image')}><ChevronLeft className="h-5 w-5" /></button><button type="button" onClick={() => move(1)} className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-gray-800 shadow-md sm:hidden" aria-label={t('product.next_image')}><ChevronRight className="h-5 w-5" /></button></>}
      </div>
      {safeImages.length > 1 && <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">{safeImages.map((image, index) => <button key={`${image}-${index}`} type="button" onClick={() => setActive(index)} className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all sm:h-20 sm:w-20 ${active === index ? 'border-[#B76E79] shadow-md' : 'border-transparent opacity-70 hover:opacity-100'}`} aria-label={t('product.show_image', { number: index + 1 })}><img src={image} alt="" className="h-full w-full object-cover" /></button>)}</div>}
    </div>
  )
}
