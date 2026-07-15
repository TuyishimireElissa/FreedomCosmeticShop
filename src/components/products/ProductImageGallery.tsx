'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Play } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import {
  getCloudinaryUrl,
  getImageSizes,
  getProductImageGallery,
  type StructuredProductImage,
} from '@/lib/cloudinary-images'

interface ProductImageGalleryProps {
  productImages?: StructuredProductImage[]
  legacyImages?: string[]
  productName: string
  videoUrl?: string | null
  discount?: number
  outOfStock?: boolean
  isAuthentic?: boolean
}

const IMAGE_TYPE_KEYS: Record<string, string> = {
  PRODUCT: 'product.image_type_product',
  PACKAGING: 'product.image_type_packaging',
  BACK_LABEL: 'product.image_type_back_label',
  SEAL: 'product.image_type_seal',
  TEXTURE: 'product.image_type_texture',
  SIZE_SCALE: 'product.image_type_size_scale',
  SHADE: 'product.image_type_shade',
  LIFESTYLE: 'product.image_type_lifestyle',
  VIDEO_THUMB: 'product.image_type_video',
}

export default function ProductImageGallery({
  productImages = [],
  legacyImages = [],
  productName,
  videoUrl,
  discount = 0,
  outOfStock = false,
  isAuthentic = false,
}: ProductImageGalleryProps) {
  const { t, language } = useLanguage()
  const [activeIndex, setActiveIndex] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)
  const touchStartX = useRef(0)
  const gallery = useMemo(() => getProductImageGallery({ productImages, images: legacyImages, name: productName }), [legacyImages, productImages, productName])
  const activeImage = gallery[activeIndex]

  useEffect(() => {
    if (activeIndex >= gallery.length) setActiveIndex(0)
  }, [activeIndex, gallery.length])

  const previous = () => {
    if (gallery.length > 1) setActiveIndex((index) => index === 0 ? gallery.length - 1 : index - 1)
    setIsZoomed(false)
  }
  const next = () => {
    if (gallery.length > 1) setActiveIndex((index) => index === gallery.length - 1 ? 0 : index + 1)
    setIsZoomed(false)
  }
  const altText = (image: StructuredProductImage) => language === 'rw' && image.altTextRw ? image.altTextRw : image.altText || productName
  const typeLabel = (imageType: string) => IMAGE_TYPE_KEYS[imageType] ? t(IMAGE_TYPE_KEYS[imageType]) : ''
  const source = (image: StructuredProductImage, thumbnail = false) => image.publicId
    ? getCloudinaryUrl(image.publicId, thumbnail ? 'THUMBNAIL' : 'DETAIL_DESKTOP')
    : image.url

  if (!activeImage) {
    return <div className="flex aspect-square items-center justify-center rounded-2xl bg-gray-100 text-sm text-gray-500">{t('product.no_image_available')}</div>
  }

  return (
    <div className="space-y-3">
      <div
        className={`group relative aspect-square overflow-hidden rounded-2xl bg-gray-50 ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
        onTouchStart={(event) => { touchStartX.current = event.touches[0].clientX }}
        onTouchEnd={(event) => {
          const difference = touchStartX.current - event.changedTouches[0].clientX
          if (Math.abs(difference) > 50) {
            if (difference > 0) next()
            else previous()
          }
        }}
        onClick={() => setIsZoomed((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setIsZoomed((value) => !value)
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={altText(activeImage)}
      >
        <Image
          src={source(activeImage)}
          alt={altText(activeImage)}
          fill
          priority={activeIndex === 0}
          className={`object-contain p-4 transition-transform duration-200 ${isZoomed ? 'scale-150' : 'scale-100'} ${outOfStock ? 'opacity-60' : ''}`}
          sizes={getImageSizes('detail')}
        />

        {activeImage.imageType !== 'PRODUCT' && typeLabel(activeImage.imageType) && (
          <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white">{typeLabel(activeImage.imageType)}</span>
        )}
        {discount > 0 && <span className="absolute right-3 top-3 rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white">-{discount}%</span>}
        {outOfStock && <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/85 px-4 py-2 text-xs font-bold text-white">{t('common.sold_out')}</span>}

        {gallery.length > 1 && (
          <>
            <button type="button" onClick={(event) => { event.stopPropagation(); previous() }} className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-gray-700 shadow-md" aria-label={t('product.previous_image')}>
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button type="button" onClick={(event) => { event.stopPropagation(); next() }} className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-gray-700 shadow-md" aria-label={t('product.next_image')}>
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-0.5 rounded-full bg-white/80 px-1 backdrop-blur">
              {gallery.map((image, index) => (
                <button key={`${image.publicId || image.url}-${index}`} type="button" onClick={(event) => { event.stopPropagation(); setActiveIndex(index); setIsZoomed(false) }} className="flex h-11 w-7 items-center justify-center" aria-label={t('product.show_image', { number: index + 1 })} aria-pressed={index === activeIndex}>
                  <span className={`block h-1.5 rounded-full transition-all ${index === activeIndex ? 'w-5 bg-[#B76E79]' : 'w-1.5 bg-gray-400'}`} />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {gallery.length > 1 && (
        <div className="scrollbar-hide scroll-smooth-ios flex gap-2 overflow-x-auto pb-1">
          {gallery.map((image, index) => (
            <button key={`${image.publicId || image.url}-thumb-${index}`} type="button" onClick={() => { setActiveIndex(index); setIsZoomed(false) }} className={`relative h-16 w-16 flex-none overflow-hidden rounded-xl border-2 bg-gray-50 transition-opacity sm:h-20 sm:w-20 ${index === activeIndex ? 'border-[#B76E79]' : 'border-gray-200 opacity-70 hover:opacity-100'}`} aria-label={altText(image)} aria-pressed={index === activeIndex}>
              <Image src={source(image, true)} alt={altText(image)} fill className="object-contain p-1" sizes={getImageSizes('thumbnail')} loading="lazy" />
              {image.imageType !== 'PRODUCT' && typeLabel(image.imageType) && <span className="absolute inset-x-0 bottom-0 truncate bg-black/70 px-1 py-0.5 text-xs leading-none text-white">{typeLabel(image.imageType)}</span>}
            </button>
          ))}
          {videoUrl && (
            <a href={videoUrl} target="_blank" rel="noreferrer" className="relative flex h-16 w-16 flex-none items-center justify-center rounded-xl border-2 border-gray-200 bg-gray-100 sm:h-20 sm:w-20" aria-label={t('product.play_video')}>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#B76E79] text-white"><Play className="ml-0.5 h-4 w-4 fill-current" aria-hidden="true" /></span>
              <span className="absolute inset-x-0 bottom-0 bg-black/70 py-0.5 text-center text-xs leading-none text-white">{t('product.video')}</span>
            </a>
          )}
        </div>
      )}

      <p className="text-center text-xs text-gray-500">{t('product.photos_count', { count: gallery.length })}{isAuthentic ? ` · ${t('product.authenticity_verified')}` : ''}</p>
    </div>
  )
}
