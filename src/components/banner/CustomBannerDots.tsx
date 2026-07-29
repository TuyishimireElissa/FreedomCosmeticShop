'use client'

interface CustomBannerDotsProps {
  count: number
  current: number
  onSelect: (index: number) => void
  label: (index: number) => string
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
export default function CustomBannerDots({ count, current, onSelect, label }: CustomBannerDotsProps) {
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
            className={`block h-2 rounded-full shadow-md transition-all duration-[400ms] ease-in-out will-change-transform group-hover/dot:scale-125 motion-reduce:transition-none motion-reduce:group-hover/dot:scale-100 ${
              index === current
                ? 'w-[30px] bg-[#B76E79] group-hover/dot:bg-[#9B5A64]'
                : 'w-2 bg-white/70 group-hover/dot:bg-white'
            }`}
          />
        </button>
      ))}
    </div>
  )
}
