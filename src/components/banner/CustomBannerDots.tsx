'use client'

interface CustomBannerDotsProps {
  count: number
  current: number
  onSelect: (index: number) => void
  label: (index: number) => string
  /** Increments on every slide change so the progress fill restarts. */
  cycle: number
  /** Freezes the progress fill while autoplay is paused. */
  paused?: boolean
}

/**
 * Animated slide indicators for the static products-page slider.
 *
 * Deliberately separate from BannerDots so the admin-managed carousel keeps
 * its existing appearance: this file is the only place the pill-stretch and
 * hover-grow behaviour is defined.
 *
 * Keeps the 44px touch target and tab semantics of the original dots.
 */
export default function CustomBannerDots({ count, current, onSelect, label, cycle, paused = false }: CustomBannerDotsProps) {
  if (count < 2) return null

  return (
    <div
      role="tablist"
      aria-label="Promotional slides"
      className="custom-banner-slider__dots absolute bottom-2 right-2 z-30 flex items-center justify-end gap-1 sm:bottom-6 sm:right-6 lg:right-10"
    >
      {Array.from({ length: count }, (_, index) => (
        <button
          key={index}
          type="button"
          role="tab"
          onClick={() => onSelect(index)}
          className="custom-banner-slider__dot group/dot grid h-11 w-11 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label={label(index)}
          aria-selected={index === current}
          aria-controls={`promo-slide-${index}`}
        >
          <span
            aria-hidden="true"
            className={`relative block h-2 overflow-hidden rounded-full shadow-md transition-all duration-[400ms] ease-in-out will-change-transform group-hover/dot:scale-[1.3] motion-reduce:transition-none motion-reduce:group-hover/dot:scale-100 ${
              index === current
                ? 'w-[30px] bg-[#B76E79]/40 shadow-[0_0_10px_rgba(183,110,121,0.9)]'
                : 'w-2 bg-white/70 group-hover/dot:bg-white'
            }`}
          >
            {index === current && (
              <span
                key={cycle}
                className={`custom-banner-slider__dot-progress absolute inset-0 block rounded-full bg-fcs-brand will-change-transform ${paused ? 'custom-banner-slider__dot-progress--paused' : ''}`}
              />
            )}
          </span>
        </button>
      ))}
    </div>
  )
}
