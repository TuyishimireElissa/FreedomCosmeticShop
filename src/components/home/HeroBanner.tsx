"use client"

/**
 * HeroBanner — auto-sliding carousel for the home page hero.
 *
 * Features:
 *   - Auto-advance every 5 seconds (pauses on hover)
 *   - Manual navigation dots + prev/next arrows
 *   - Mobile-optimized: uses mobileImage on small screens if available
 *   - CTA buttons (Shop Now, Learn More)
 *   - Falls back to a static hero if no banners in DB
 *   - Ken Burns zoom effect on the active slide
 *   - Multi-language ready (title/subtitle can be localized in Banner model)
 */

import { useEffect, useState, useCallback } from "react"
import { useStore } from "@/store/useStore"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles } from "lucide-react"

interface Banner {
  id: string
  title: string
  subtitle: string | null
  image: string
  mobileImage: string | null
  linkType: string | null
  linkUrl: string | null
  placement: string
}

interface HeroBannerProps {
  banners: Banner[]
}

const AUTO_ADVANCE_MS = 5000

export function HeroBanner({ banners }: HeroBannerProps) {
  const { goCatalog } = useStore()
  const [current, setCurrent] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  // Fallback hero if no banners in DB
  const slides: Banner[] =
    banners.length > 0
      ? banners
      : [
          {
            id: "fallback-1",
            title: "Beauty that unites us",
            subtitle:
              "Shop authentic skincare, makeup & haircare — hand-picked for melanin-rich skin and textured hair. Pay with MTN MoMo or cash on delivery.",
            image:
              "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1200&auto=format&fit=crop",
            mobileImage:
              "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop",
            linkType: "CATEGORY",
            linkUrl: "skincare",
            placement: "HOME_HERO",
          },
          {
            id: "fallback-2",
            title: "Glow from within",
            subtitle:
              "Vitamin C serums, mineral sunscreens & hydrating moisturizers. formulated for Rwanda's climate.",
            image:
              "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=1200&auto=format&fit=crop",
            mobileImage:
              "https://images.unsplash.com/photo-1556228852-80b6e5eeff06?w=600&auto=format&fit=crop",
            linkType: "CATEGORY",
            linkUrl: "skincare",
            placement: "HOME_HERO",
          },
          {
            id: "fallback-3",
            title: "Shades for every skin tone",
            subtitle:
              "Foundations, lipsticks & palettes made for melanin-rich skin. No ashiness, no compromise.",
            image:
              "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=1200&auto=format&fit=crop",
            mobileImage:
              "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&auto=format&fit=crop",
            linkType: "CATEGORY",
            linkUrl: "makeup",
            placement: "HOME_HERO",
          },
        ]

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % slides.length)
  }, [slides.length])

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + slides.length) % slides.length)
  }, [slides.length])

  // Auto-advance
  useEffect(() => {
    if (isPaused || slides.length <= 1) return
    const timer = setInterval(next, AUTO_ADVANCE_MS)
    return () => clearInterval(timer)
  }, [isPaused, next, slides.length])

  const handleCtaClick = (banner: Banner) => {
    if (banner.linkType === "CATEGORY" && banner.linkUrl) {
      goCatalog(banner.linkUrl)
    } else if (banner.linkType === "URL" && banner.linkUrl) {
      window.open(banner.linkUrl, "_blank")
    } else {
      goCatalog(null)
    }
  }

  return (
    <section
      className="relative overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-label="Featured promotions"
    >
      <div className="relative h-[480px] sm:h-[520px] lg:h-[600px]">
        {slides.map((slide, i) => {
          const isActive = i === current
          // Use mobile image on small screens if available
          const image =
            slide.mobileImage && typeof window !== "undefined" && window.innerWidth < 640
              ? slide.mobileImage
              : slide.image
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-700 ${
                isActive ? "opacity-100 z-10" : "opacity-0 z-0"
              }`}
              aria-hidden={!isActive}
            >
              {/* Background image with Ken Burns effect */}
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src={image}
                  alt={slide.title}
                  className={`h-full w-full object-cover transition-transform duration-[6000ms] ease-out ${
                    isActive ? "scale-110" : "scale-100"
                  }`}
                />
                {/* Gradient overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-foreground/70 via-foreground/30 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 via-transparent to-transparent" />
              </div>

              {/* Content */}
              <div className="relative z-10 flex h-full items-center">
                <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                  <div className="max-w-xl">
                    {isActive && (
                      <>
                        <span className="inline-flex animate-in fade-in slide-in-from-left-4 items-center gap-1.5 rounded-full bg-primary/90 px-3 py-1 text-xs font-medium text-primary-foreground backdrop-blur">
                          <Sparkles className="h-3.5 w-3.5" />
                          Made for Rwandan beauty
                        </span>
                        <h1
                          className="mt-4 animate-in fade-in slide-in-from-bottom-4 text-3xl font-bold leading-tight tracking-tight text-background sm:text-4xl lg:text-5xl"
                          style={{ animationDelay: "100ms" }}
                        >
                          {slide.title}
                        </h1>
                        {slide.subtitle && (
                          <p
                            className="mt-3 animate-in fade-in slide-in-from-bottom-4 text-sm text-background/85 sm:text-base lg:text-lg"
                            style={{ animationDelay: "200ms" }}
                          >
                            {slide.subtitle}
                          </p>
                        )}
                        <div
                          className="mt-6 flex animate-in fade-in slide-in-from-bottom-4 flex-wrap gap-3"
                          style={{ animationDelay: "300ms" }}
                        >
                          <Button
                            size="lg"
                            onClick={() => handleCtaClick(slide)}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            Shop now
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                          <Button
                            size="lg"
                            variant="outline"
                            onClick={() => goCatalog(null)}
                            className="border-background/30 bg-background/10 text-background backdrop-blur hover:bg-background/20"
                          >
                            Browse all
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Navigation arrows (desktop) */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-background/20 p-2 text-background backdrop-blur transition-colors hover:bg-background/40 lg:block"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-background/20 p-2 text-background backdrop-blur transition-colors hover:bg-background/40 lg:block"
            aria-label="Next slide"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-2 rounded-full transition-all ${
                i === current
                  ? "w-8 bg-primary"
                  : "w-2 bg-background/50 hover:bg-background/80"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
