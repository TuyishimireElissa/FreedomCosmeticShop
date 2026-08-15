'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { MessageCircle, ShieldCheck } from 'lucide-react'
import type { HomeBanner } from '@/components/home/HeroBanner'
import { useT } from '@/lib/i18n/LanguageContext'
import { BUSINESS, getWhatsAppLink, isPlaceholder } from '@/lib/business-config'
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
  // Reuse the config helper rather than hard-coding wa.me — it already refuses
  // to publish an unconfigured placeholder number.
  const whatsappHref = isPlaceholder(BUSINESS.whatsapp)
    ? null
    : getWhatsAppLink(t('whatsapp.general_help'))
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
      className="relative h-[420px] overflow-hidden bg-[#1a1a1a] sm:h-[460px] md:h-[540px]"
      aria-label={t('home.hero_title')}
      aria-busy={loading}
    >
      {isLowData && (
        <p className="absolute right-3 top-3 z-30 rounded-full border border-white/25 bg-black/75 px-3 py-2 text-xs font-semibold text-white">
          {t('low_data.hero_optimized')}
        </p>
      )}
      {/* The zoom lives on a wrapper, not the <img>, so Next's fill layout and
        * the object-cover crop are untouched by the transform. */}
      <div className={`absolute inset-0 ${showImage && !isLowData ? 'fcs-hero-zoom' : ''}`}>
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
      </div>

      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/20" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/15" aria-hidden="true" />
      {/* Melts the hero into the page below instead of ending on a hard line.
        * Sits under the content layer (z-10) so it never dims the copy. */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-white"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-5 md:px-12 lg:px-20">
        <div className="max-w-sm md:max-w-lg">
          {/* Serif for the hero statement — Georgia ships on every Android and
            * iOS device, so this costs 0 KB. UI chrome below stays sans. */}
          <h1 className="mb-3 font-display text-4xl font-normal leading-[1.08] tracking-[-0.01em] text-white md:text-5xl lg:text-[56px]">
            {t('home.hero_title')}
          </h1>
          <p className="mb-5 text-sm leading-relaxed text-white/90 md:text-base lg:text-lg">
            {t('home.hero_description')}
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            {/* Scrolls to the curated shelf when it is on the page, otherwise
              * navigates to the catalogue. FeaturedBento hides itself when the
              * owner has curated nothing, so a plain href="#featured-products"
              * would be a dead link on an empty catalogue. Checking at click
              * time rather than render time avoids an SSR/DOM mismatch. */}
            <Link
              href="/products"
              onClick={(event) => {
                const target = document.getElementById('featured-products')
                if (!target) return
                event.preventDefault()
                const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
                target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
              }}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-fcs-brand-strong px-7 text-sm font-semibold text-white transition-colors duration-150 ease-fcs-snap hover:bg-fcs-brand-strong-hover active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              {t('home.hero_cta_primary')}
            </Link>
            {/* WhatsApp is the only working order path, so it belongs above the
              * fold. This replaced a "Wholesale Deals" link that sent first-time
              * retail buyers to a wholesale application form. Wholesale keeps
              * its nav entry and its page. */}
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-fcs-whatsapp-pill px-7 text-sm font-semibold text-white transition-colors duration-150 ease-fcs-snap hover:bg-fcs-whatsapp-pill-hover active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                {t('home.hero_cta_secondary')}
              </a>
            )}
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
