"use client"

/**
 * ReviewsCarousel — customer reviews with auto-advance + manual navigation.
 *
 * Features:
 *   - 3 reviews visible on desktop, 1 on mobile
 *   - Auto-advance every 6 seconds
 *   - Star ratings
 *   - Customer name + city
 *   - Avatar with initials
 */

import { useEffect, useState, useCallback } from "react"
import { Star, Quote, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react"
import { useT } from '@/lib/i18n/LanguageContext'
import IconButton from '@/components/a11y/IconButton'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useLowData } from '@/contexts/LowDataContext'

interface Review {
  name: string
  city: string
  rating: number
  text: string
  product: string
}

interface ReviewsCarouselProps {
  reviews?: Review[]
}

const DEFAULT_REVIEWS: Review[] = [
  {
    name: "Aline M.",
    city: "Kigali",
    rating: 5,
    text: "The Vitamin C serum brightened my skin in 2 weeks. Delivery was fast — I paid with MoMo and got my order the next day. Will definitely order again!",
    product: "Vitamin C Brightening Serum",
  },
  {
    name: "Claudine U.",
    city: "Huye",
    rating: 5,
    text: "Finally a foundation that matches my skin tone without looking ashy! The Mocha lipstick is my new everyday shade. Thank you FreedomCosmeticShop.",
    product: "Full Coverage Foundation — Deep",
  },
  {
    name: "Peace I.",
    city: "Musanze",
    rating: 5,
    text: "The hair growth oil really works. My edges are filling in after 6 weeks of use. Highly recommend to anyone with thinning edges!",
    product: "Hair Growth Oil — Rosemary & Peppermint",
  },
  {
    name: "Diane K.",
    city: "Rubavu",
    rating: 5,
    text: "I love that I can pay with cash on delivery. The sunscreen has no white cast on my dark skin. Fast delivery even outside Kigali!",
    product: "Mineral Sunscreen SPF 50",
  },
  {
    name: "Eric N.",
    city: "Rwamagana",
    rating: 4,
    text: "Bought the edge control for my wife and she loves it. Strong hold all day without flaking. Customer service was helpful when I called.",
    product: "Edge Control Gel — Strong Hold",
  },
  {
    name: "Solange M.",
    city: "Muhanga",
    rating: 5,
    text: "The deep conditioner transformed my dry hair. So soft and manageable after one use. The shea butter smell is amazing too!",
    product: "Deep Conditioner — Moisture Lock",
  },
]

export function ReviewsCarousel({ reviews = DEFAULT_REVIEWS }: ReviewsCarouselProps) {
  const t = useT()
  const [current, setCurrent] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [interactionPaused, setInteractionPaused] = useState(false)
  const [reducedMotionOverride, setReducedMotionOverride] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const { isLowData } = useLowData()
  const reducedMotionPause = prefersReducedMotion && !reducedMotionOverride
  const controlPaused = isLowData || isPaused || reducedMotionPause
  const autoAdvancePaused = controlPaused || interactionPaused

  // Number of reviews to show at once (1 on mobile, 3 on desktop)
  // We'll use CSS to handle the responsive layout, and advance by 1
  const advance = useCallback(() => {
    setCurrent((c) => (c + 1) % reviews.length)
  }, [reviews.length])

  useEffect(() => {
    if (autoAdvancePaused || reviews.length < 2) return
    const timer = window.setInterval(advance, 6000)
    return () => window.clearInterval(timer)
  }, [advance, autoAdvancePaused, reviews.length])

  const prev = () => setCurrent((c) => (c - 1 + reviews.length) % reviews.length)
  const next = () => setCurrent((c) => (c + 1) % reviews.length)
  const togglePlayback = () => {
    if (isLowData) return
    if (reducedMotionPause) {
      setReducedMotionOverride(true)
      setIsPaused(false)
    } else {
      setIsPaused((value) => !value)
    }
  }

  return (
    <section
      className="bg-secondary/30 py-12"
      onMouseEnter={() => setInteractionPaused(true)}
      onMouseLeave={() => setInteractionPaused(false)}
      onFocusCapture={() => setInteractionPaused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setInteractionPaused(false) }}
      aria-roledescription="carousel"
      aria-label={t('accessibility.reviews_carousel')}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="rounded-full bg-background px-2.5 py-0.5 text-xs font-medium text-primary">
              {t('home.testimonials')}
            </span>
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            {t('home.loved_by_rwandans')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('home.reviews_countrywide')}
          </p>
          {isLowData && (
            <p id="reviews-low-data-status" className="mx-auto mt-3 w-fit rounded-full border bg-background px-3 py-2 text-xs font-semibold text-foreground">
              {t('low_data.carousel_paused')}
            </p>
          )}
          <div className="mt-3 flex items-center justify-center gap-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="h-5 w-5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="text-sm font-medium">4.8/5</span>
            <span className="text-sm text-muted-foreground">
              {t('home.from_reviews', { count: '1,200+' })}
            </span>
          </div>
        </div>

        {/* Reviews grid — shows 3 at a time, advancing by 1 */}
        <div className="relative">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[0, 1, 2].map((offset) => {
              const idx = (current + offset) % reviews.length
              const review = reviews[idx]
              return (
                <div
                  key={`${review.name}-${idx}-${offset}`}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={t('accessibility.slide_position', { current: idx + 1, total: reviews.length })}
                  className="relative rounded-2xl border bg-card p-5 shadow-sm transition-all hover:shadow-md"
                >
                  <Quote className="absolute right-4 top-4 h-8 w-8 text-primary/20" />

                  {/* Stars */}
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-4 w-4 ${
                          s <= review.rating
                            ? "fill-amber-400 text-amber-400"
                            : "fill-muted text-muted"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Text */}
                  <p className="mt-3 text-sm leading-relaxed text-foreground/85">
                    &ldquo;{review.text}&rdquo;
                  </p>

                  {/* Product */}
                  <p className="mt-3 text-xs font-medium text-primary">
                    {review.product}
                  </p>

                  {/* Author */}
                  <div className="mt-4 flex items-center gap-2 border-t pt-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {review.name.charAt(0)}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{review.name}</p>
                      <p className="text-xs text-muted-foreground">{review.city}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Navigation */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <IconButton label={t('home.previous_reviews')} icon={<ChevronLeft className="h-4 w-4" />} onClick={prev} className="border bg-white" />
            <div className="flex max-w-full gap-0.5 overflow-x-auto" role="tablist" aria-label={t('accessibility.reviews_carousel')}>
              {reviews.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  onClick={() => setCurrent(i)}
                  className="grid h-11 w-11 place-items-center rounded-full"
                  aria-label={t('home.review_group', { number: i + 1 })}
                  aria-selected={i === current}
                >
                  <span aria-hidden="true" className={`h-2 rounded-full transition-all ${i === current ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/40'}`} />
                </button>
              ))}
            </div>
            <IconButton label={t('home.next_reviews')} icon={<ChevronRight className="h-4 w-4" />} onClick={next} className="border bg-white" />
            <IconButton label={controlPaused ? t('accessibility.play_carousel') : t('accessibility.pause_carousel')} icon={controlPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />} onClick={togglePlayback} disabled={isLowData} aria-describedby={isLowData ? 'reviews-low-data-status' : undefined} className="border bg-white" />
          </div>
          <div className="sr-only" aria-live="polite" aria-atomic="true">{t('accessibility.slide_position', { current: current + 1, total: reviews.length })}</div>
        </div>
      </div>
    </section>
  )
}
