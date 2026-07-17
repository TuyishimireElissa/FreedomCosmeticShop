'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import type { HomeBanner } from '@/components/home/HeroBanner'
import { useT } from '@/lib/i18n/LanguageContext'
import { useLowData } from '@/contexts/LowDataContext'
import { IMAGE_QUALITY, IMAGE_SIZES, optimizeCloudinaryUrl } from '@/lib/cloudinary-images'

interface HeroProps {
  banners: HomeBanner[]
  loading?: boolean
  error?: string | null
}

const FALLBACK_GRADIENT = 'linear-gradient(135deg, #B76E79 0%, #8B4A55 50%, #1a1a1a 100%)'

export default function Hero({ banners, loading = false, error }: HeroProps) {
  const t = useT()
  const { isLowData } = useLowData()
  const [imageError, setImageError] = useState(false)
  const banner = banners[0]
  const desktopImage = banner?.image
  const mobileImage = banner?.mobileImage || desktopImage
  const lowDataImage = mobileImage
    ? optimizeCloudinaryUrl(mobileImage, { width: IMAGE_SIZES.hero.lowData, quality: IMAGE_QUALITY.lowData })
    : undefined
  const optimizedMobileImage = mobileImage
    ? optimizeCloudinaryUrl(mobileImage, { width: IMAGE_SIZES.hero.mobile })
    : undefined
  const optimizedDesktopImage = desktopImage
    ? optimizeCloudinaryUrl(desktopImage, { width: IMAGE_SIZES.hero.desktop })
    : undefined
  const showImage = Boolean(desktopImage) && !imageError && !error

  return (
    <section
      className="relative h-[280px] overflow-hidden bg-[#1a1a1a] sm:h-[340px] md:h-[440px] lg:h-[520px]"
      aria-label={t('home.hero_title')}
      aria-busy={loading}
    >
      {isLowData && (
        <p className="absolute right-3 top-3 z-30 rounded-full border border-white/25 bg-black/75 px-3 py-2 text-xs font-semibold text-white">
          {t('low_data.hero_optimized')}
        </p>
      )}
      {showImage ? (
        isLowData ? (
          <img
            src={lowDataImage}
            alt={t('home.hero_alt')}
            width={IMAGE_SIZES.hero.lowData}
            height={Math.round(IMAGE_SIZES.hero.lowData / 1.25)}
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <picture className="absolute inset-0 block">
            {optimizedMobileImage && <source media="(max-width: 767px)" srcSet={optimizedMobileImage} />}
            <Image
              src={optimizedDesktopImage!}
              alt={t('home.hero_alt')}
              fill
              priority
              sizes="100vw"
              className="object-cover"
              onError={() => setImageError(true)}
            />
          </picture>
        )
      ) : (
        <div
          className={`absolute inset-0 ${loading ? 'animate-pulse motion-reduce:animate-none' : ''}`}
          style={{ background: FALLBACK_GRADIENT }}
          aria-hidden="true"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/20" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/15" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-5 md:px-12 lg:px-20">
        <div className="max-w-sm md:max-w-lg">
          <h1 className="mb-3 text-2xl font-bold leading-tight text-white sm:text-3xl md:text-4xl lg:text-5xl">
            {t('home.hero_title')}
          </h1>
          <p className="mb-5 text-sm leading-relaxed text-white/90 md:text-base lg:text-lg">
            {t('home.hero_description')}
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/products"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#B76E79] px-6 text-base font-semibold text-white shadow-lg shadow-[#B76E79]/30 transition-colors duration-150 hover:bg-[#a55d68]"
            >
              {t('home.hero_cta_primary')}
            </Link>
            <Link
              href="/wholesale"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-white/60 bg-white/15 px-6 text-base font-semibold text-white transition-colors duration-150 hover:bg-white/25"
            >
              {t('home.hero_cta_secondary')}
            </Link>
          </div>

          <p className="mt-4 flex items-center gap-1.5 text-xs font-medium text-white/80">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            {t('product.authentic_guarantee')}
          </p>
        </div>
      </div>
    </section>
  )
}
