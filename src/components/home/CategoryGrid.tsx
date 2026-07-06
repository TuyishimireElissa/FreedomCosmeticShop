"use client"

/**
 * CategoryGrid — grid of category tiles with icons and images.
 *
 * Features:
 *   - Responsive: 2 cols mobile, 3 cols tablet, 4-5 cols desktop
 *   - Hover zoom effect on images
 *   - Gradient overlay for text readability
 *   - Includes fragrance & bath categories as static tiles
 *   - Click navigates to catalog filtered by category
 */

import { useStore } from "@/store/useStore"
import { Category } from "@/lib/types"
import { ArrowRight } from "lucide-react"

interface CategoryGridProps {
  categories: Category[]
}

// Icon mapping for categories (using emoji for simplicity + universal support)
const CATEGORY_ICONS: Record<string, string> = {
  skincare: "🧴",
  makeup: "💄",
  haircare: "💇🏾‍♀️",
  fragrance: "🌸",
  "bath-body": "🛁",
  "mens-grooming": "🪒",
}

// Extra categories to show even if not in DB (visual completeness)
const EXTRA_CATEGORIES = [
  {
    id: "fragrance",
    name: "Fragrance",
    slug: "fragrance",
    description: "Perfumes & body mists",
    image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&auto=format&fit=crop",
  },
  {
    id: "bath-body",
    name: "Bath & Body",
    slug: "bath-body",
    description: "Soaps, lotions & scrubs",
    image: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&auto=format&fit=crop",
  },
]

export function CategoryGrid({ categories }: CategoryGridProps) {
  const { goCatalog } = useStore()

  // Combine DB categories with extra visual ones
  const allCategories = [
    ...categories,
    ...EXTRA_CATEGORIES.filter(
      (e) => !categories.some((c) => c.slug === e.slug)
    ),
  ]

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Shop by category
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Find exactly what you need across our collections.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
        {allCategories.slice(0, 5).map((cat) => {
          const icon = CATEGORY_ICONS[cat.slug] || "✨"
          return (
            <button
              key={cat.id || cat.slug}
              onClick={() => goCatalog(cat.slug)}
              className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-secondary/30 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg sm:aspect-square"
            >
              {cat.image && (
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
              )}
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />

              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-end p-4">
                <span className="mb-1 text-2xl drop-shadow-lg" aria-hidden="true">
                  {icon}
                </span>
                <h3 className="text-base font-bold text-background drop-shadow sm:text-lg">
                  {cat.name}
                </h3>
                <p className="mt-0.5 line-clamp-1 text-xs text-background/80">
                  {cat.description}
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-background">
                  Shop now
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
