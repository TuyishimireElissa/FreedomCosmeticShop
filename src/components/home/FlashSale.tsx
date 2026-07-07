"use client"

/**
 * FlashSale — flash sale section with live countdown timer.
 *
 * Features:
 *   - Countdown timer (hours:minutes:seconds)
 *   - Products with discounts from the database
 *   - Horizontal scroll on mobile
 *   - "View all" link to catalog
 *
 * Placed between categories and best sellers on the homepage.
 */

import { useEffect, useState } from "react"
import { useStore } from "@/store/useStore"
import { Product } from "@/lib/types"
import { ProductCard } from "@/components/storefront/ProductCard"
import { Skeleton } from "@/components/ui/skeleton"
import { formatRWF } from "@/lib/format"
import { Zap, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function FlashSale() {
  const { goCatalog, goProduct } = useStore()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })

  // Countdown timer — counts down to end of day
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date()
      const endOfDay = new Date()
      endOfDay.setHours(23, 59, 59, 999)
      const diff = endOfDay.getTime() - now.getTime()

      return {
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      }
    }

    setTimeLeft(calculateTimeLeft())
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Fetch products with discounts (compareAt > price)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/products?limit=8&sort=price-desc")
        const data = await res.json()
        if (cancelled) return
        // Filter products that have a discount
        const discounted = (data.products || []).filter(
          (p: Product) => p.compareAt && p.compareAt > p.price
        )
        setProducts(discounted.slice(0, 4))
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const pad = (n: number) => String(n).padStart(2, "0")

  // Don't render if no discounted products
  if (!loading && products.length === 0) return null

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header with countdown */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-orange-500">
            <Zap className="h-5 w-5 text-white" />
          </span>
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              ⚡ Flash Sale
            </h2>
            <p className="text-sm text-muted-foreground">
              Limited time deals — grab them before they're gone!
            </p>
          </div>
        </div>

        {/* Countdown timer */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Ends in</span>
          <div className="flex items-center gap-1">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-foreground font-mono text-lg font-bold text-background">
              {pad(timeLeft.hours)}
            </span>
            <span className="text-lg font-bold">:</span>
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-foreground font-mono text-lg font-bold text-background">
              {pad(timeLeft.minutes)}
            </span>
            <span className="text-lg font-bold">:</span>
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-foreground font-mono text-lg font-bold text-background">
              {pad(timeLeft.seconds)}
            </span>
          </div>
        </div>
      </div>

      {/* Products */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* View all */}
      <div className="mt-4 text-center">
        <Button variant="outline" size="sm" onClick={() => goCatalog(null)}>
          View all deals <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </section>
  )
}
