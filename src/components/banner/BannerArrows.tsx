'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface BannerArrowsProps {
  onPrevious: () => void
  onNext: () => void
  previousLabel: string
  nextLabel: string
}

/**
 * Previous/next controls.
 * Always visible on mobile; revealed on hover or keyboard focus on desktop —
 * the same treatment ProductImageGallery uses for its gallery arrows.
 */
export default function BannerArrows({ onPrevious, onNext, previousLabel, nextLabel }: BannerArrowsProps) {
  const base =
    'absolute top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-gray-700 shadow-md transition-all duration-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B76E79] md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100'

  return (
    <>
      <button type="button" onClick={onPrevious} className={`${base} left-2 md:left-3`} aria-label={previousLabel}>
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </button>
      <button type="button" onClick={onNext} className={`${base} right-2 md:right-3`} aria-label={nextLabel}>
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>
    </>
  )
}
