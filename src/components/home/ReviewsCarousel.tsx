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
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useT } from '@/lib/i18n/LanguageContext'

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

  // Number of reviews to show at once (1 on mobile, 3 on desktop)
  // We'll use CSS to handle the responsive layout, and advance by 1
  const advance = useCallback(() => {
    setCurrent((c) => (c + 1) % reviews.length)
  }, [reviews.length])

  useEffect(() => {
    if (isPaused) return
    const timer = setInterval(advance, 6000)
    return () => clearInterval(timer)
  }, [isPaused, advance])

  const prev = () => setCurrent((c) => (c - 1 + reviews.length) % reviews.length)
  const next = () => setCurrent((c) => (c + 1) % reviews.length)

  return (
    <section
      className="bg-secondary/30 py-12"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
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
                  key={`${review.name}-${idx}`}
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
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={prev}
              aria-label={t('home.previous_reviews')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex gap-1.5">
              {reviews.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === current ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"
                  }`}
                  aria-label={t('home.review_group', { number: i + 1 })}
                />
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={next}
              aria-label={t('home.next_reviews')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
