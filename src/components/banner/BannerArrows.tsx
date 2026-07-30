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
  // Glass control: rests at low opacity, lifts on hover, dips on press.
  const base =
    'cb-arrow absolute top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full ' +
    'border border-white/15 bg-white/10 text-white opacity-60 shadow-none backdrop-blur-md ' +
    'transition-all duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ' +
    'hover:scale-[1.08] hover:border-white/30 hover:bg-white/20 hover:opacity-100 ' +
    'hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)] ' +
    'active:scale-95 active:duration-[120ms] ' +
    'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ' +
    'motion-reduce:transition-none motion-reduce:hover:scale-100 ' +
    'max-md:opacity-0 max-md:pointer-events-none'

  return (
    <>
      <button type="button" onClick={onPrevious} className={`${base} group/arrow left-2 md:left-3`} aria-label={previousLabel}>
        <ChevronLeft className="h-5 w-5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/arrow:-translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
      </button>
      <button type="button" onClick={onNext} className={`${base} group/arrow right-2 md:right-3`} aria-label={nextLabel}>
        <ChevronRight className="h-5 w-5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/arrow:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
      </button>
    </>
  )
}
