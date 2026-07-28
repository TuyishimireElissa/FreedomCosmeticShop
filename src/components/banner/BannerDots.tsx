'use client'

interface BannerDotsProps {
  count: number
  current: number
  onSelect: (index: number) => void
  label: (index: number) => string
}

/** Slide indicators. Mirrors the HeroBanner dot pattern: 44px touch targets, tab semantics. */
export default function BannerDots({ count, current, onSelect, label }: BannerDotsProps) {
  if (count < 2) return null

  return (
    <div role="tablist" aria-label="Promotional slides" className="absolute inset-x-0 bottom-1 z-20 flex items-center justify-center gap-0.5">
      {Array.from({ length: count }, (_, index) => (
        <button
          key={index}
          type="button"
          role="tab"
          onClick={() => onSelect(index)}
          className="grid h-11 w-11 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label={label(index)}
          aria-selected={index === current}
          aria-controls={`promo-slide-${index}`}
        >
          <span
            aria-hidden="true"
            className={`h-2 rounded-full shadow-sm transition-all duration-300 ${index === current ? 'w-7 bg-[#B76E79]' : 'w-2 bg-white/70'}`}
          />
        </button>
      ))}
    </div>
  )
}
