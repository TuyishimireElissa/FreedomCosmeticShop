'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export interface PromoBanner {
  id: string
  title: string
  subtitle: string | null
  image: string
  mobileImage: string | null
  linkType: string | null
  linkUrl: string | null
  textPosition: string | null
  textColor: string | null
}

interface BannerSlideProps {
  banner: PromoBanner
  index: number
  isActive: boolean
  priority: boolean
  ctaLabel: string
}

const POSITION_CLASSES = {
  left: 'items-start text-left',
  center: 'items-center text-center',
  right: 'items-end text-right',
} as const

const OVERLAY_CLASSES = {
  left: 'bg-gradient-to-r from-black/65 via-black/35 to-transparent',
  center: 'bg-black/45',
  right: 'bg-gradient-to-l from-black/65 via-black/35 to-transparent',
} as const

const LIGHT_OVERLAY_CLASSES = {
  left: 'bg-gradient-to-r from-white/85 via-white/55 to-transparent',
  center: 'bg-white/70',
  right: 'bg-gradient-to-l from-white/85 via-white/55 to-transparent',
} as const

type TextPosition = keyof typeof POSITION_CLASSES

/** "light" means light text on a dark scrim; "dark" means dark text on a light scrim. */
function resolvePosition(value: string | null): TextPosition {
  return value === 'center' || value === 'right' ? value : 'left'
}

function isDarkText(value: string | null): boolean {
  return value === 'dark'
}

/** Only internal paths and http(s) links are followed; javascript:/data: never reach an href. */
function resolveHref(banner: PromoBanner): string | null {
  const target = banner.linkUrl?.trim()
  if (!target) return null
  if (banner.linkType === 'CATEGORY') return `/products?category=${encodeURIComponent(target)}`
  if (banner.linkType === 'PRODUCT') return `/products/${encodeURIComponent(target)}`
  if (banner.linkType === 'BLOG_POST') return `/blog/${encodeURIComponent(target)}`
  if (target.startsWith('/')) return target
  if (/^https?:\/\//i.test(target)) return target
  return null
}

export default function BannerSlide({ banner, index, isActive, priority, ctaLabel }: BannerSlideProps) {
  const position = resolvePosition(banner.textPosition)
  const darkText = isDarkText(banner.textColor)
  const href = resolveHref(banner)
  const isExternal = Boolean(href && /^https?:\/\//i.test(href))
  const hasOverlayText = Boolean(banner.title || banner.subtitle || href)

  return (
    <div
      id={`promo-slide-${index}`}
      role="tabpanel"
      aria-hidden={!isActive}
      aria-roledescription="slide"
      aria-label={banner.title}
      className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${isActive ? 'z-10 opacity-100' : 'pointer-events-none z-0 opacity-0'}`}
    >
      <Image
        src={banner.image}
        alt={banner.title}
        fill
        sizes="(max-width: 1280px) 100vw, 1280px"
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        className="object-cover"
      />

      {hasOverlayText && (
        <div
          className={`absolute inset-0 ${darkText ? LIGHT_OVERLAY_CLASSES[position] : OVERLAY_CLASSES[position]}`}
          aria-hidden="true"
        />
      )}

      {hasOverlayText && (
        <div className={`absolute inset-0 z-10 flex flex-col justify-center gap-2 px-6 py-6 sm:px-10 md:px-14 ${POSITION_CLASSES[position]}`}>
          {banner.title && (
            <h2 className={`max-w-xl text-lg font-black leading-tight tracking-tight sm:text-2xl md:text-3xl ${darkText ? 'text-[#1a1a1a]' : 'text-white'}`}>
              {banner.title}
            </h2>
          )}
          {banner.subtitle && (
            <p className={`max-w-xl text-xs leading-snug sm:text-sm md:text-base ${darkText ? 'text-gray-700' : 'text-white/90'}`}>
              {banner.subtitle}
            </p>
          )}
          {href && (
            <Link
              href={href}
              prefetch={false}
              tabIndex={isActive ? 0 : -1}
              {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="mt-1 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#B76E79] px-5 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[#9B5A64] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
            >
              {ctaLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
