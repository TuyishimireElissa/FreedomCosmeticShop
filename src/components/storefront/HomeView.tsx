"use client"

/**
 * Home view for Ubumwe Beauty.
 *
 * Sections:
 *  1. Hero — bold headline, CTA buttons, hero image
 *  2. Trust bar — delivery, payment, authenticity badges
 *  3. Category tiles — 3 big clickable tiles (Skincare / Makeup / Haircare)
 *  4. Featured products — grid of featured products (with "View all" CTA)
 *  5. Promotional banner — MTN MoMo + COD messaging
 *  6. New arrivals — second product grid (latest 4)
 *  7. Testimonials — simple 3-card row
 */

import { useEffect, useState } from "react"
import { useStore } from "@/store/useStore"
import { Product, Category } from "@/lib/types"
import { ProductCard } from "./ProductCard"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Truck,
  ShieldCheck,
  Sparkles,
  Smartphone,
  ArrowRight,
  Star,
  Quote,
} from "lucide-react"

export function HomeView() {
  const { goCatalog, goProduct } = useStore()
  const [featured, setFeatured] = useState<Product[]>([])
  const [newArrivals, setNewArrivals] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [featuredRes, newArrivalsRes, catsRes] = await Promise.all([
          fetch("/api/products?featured=true&limit=8&sort=rating"),
          fetch("/api/products?limit=4&sort=newest"),
          fetch("/api/categories"),
        ])
        const featuredJson = await featuredRes.json()
        const newArrivalsJson = await newArrivalsRes.json()
        const catsJson = await catsRes.json()
        if (cancelled) return
        setFeatured(featuredJson.products || [])
        setNewArrivals(newArrivalsJson.products || [])
        setCategories(catsJson.categories || [])
      } catch (e) {
        console.error("HomeView load failed:", e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex flex-col">
      {/* ---------- Hero ---------- */}
      <section className="hero-gradient relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:py-20">
          <div className="flex flex-col items-start gap-5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground/80">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Made for Rwandan beauty
            </span>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Beauty that <span className="text-primary">unites</span> us.
            </h1>
            <p className="max-w-md text-base text-muted-foreground sm:text-lg">
              Shop authentic skincare, makeup &amp; haircare — hand-picked for
              melanin-rich skin and textured hair. Pay with MTN MoMo or cash on
              delivery. Fast shipping across Rwanda.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={() => goCatalog(null)}>
                Shop all products
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => goCatalog("skincare")}
              >
                Explore skincare
              </Button>
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                4.7/5 from 1,200+ reviews
              </span>
              <span className="flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-primary" />
                Free delivery in Kigali over RWF 50,000
              </span>
            </div>
          </div>

          {/* Hero image collage */}
          <div className="relative grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-3 sm:space-y-4">
              <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-secondary/40 shadow-lg">
                <img
                  src="https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop"
                  alt="Skincare products"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="aspect-square overflow-hidden rounded-2xl bg-secondary/40 shadow-lg">
                <img
                  src="https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=600&auto=format&fit=crop"
                  alt="Haircare products"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            <div className="space-y-3 sm:space-y-4 pt-6 sm:pt-10">
              <div className="aspect-square overflow-hidden rounded-2xl bg-secondary/40 shadow-lg">
                <img
                  src="https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&auto=format&fit=crop"
                  alt="Makeup products"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-secondary/40 shadow-lg">
                <img
                  src="https://images.unsplash.com/photo-1556228852-80b6e5eeff06?w=600&auto=format&fit=crop"
                  alt="Sunscreen"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Trust bar ---------- */}
      <section className="border-y bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-6 sm:px-6 md:grid-cols-4 lg:px-8">
          {[
            {
              icon: Truck,
              title: "Fast delivery",
              desc: "1-3 days in Kigali, 3-5 days in provinces",
            },
            {
              icon: Smartphone,
              title: "MTN MoMo & COD",
              desc: "Pay your way — mobile money or cash",
            },
            {
              icon: ShieldCheck,
              title: "Authentic products",
              desc: "100% genuine, sourced from authorized distributors",
            },
            {
              icon: Sparkles,
              title: "Made for Rwanda",
              desc: "Shades & formulas for melanin-rich skin",
            },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-primary">
                <item.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Categories ---------- */}
      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Shop by category
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Three curated collections, picked for your routine.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(categories.length > 0 ? categories : []).map((cat) => (
            <button
              key={cat.id}
              onClick={() => goCatalog(cat.slug)}
              className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-secondary/30 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
            >
              {cat.image && (
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 text-background">
                <h3 className="text-xl font-bold">{cat.name}</h3>
                <p className="mt-1 text-sm text-background/80 line-clamp-2">
                  {cat.description}
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium">
                  Shop now <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </button>
          ))}
          {loading &&
            [0, 1, 2].map((i) => (
              <Skeleton key={`skeleton-cat-${i}`} className="aspect-[4/3] rounded-2xl" />
            ))}
        </div>
      </section>

      {/* ---------- Featured products ---------- */}
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Featured products
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Customer favorites, handpicked for you.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => goCatalog(null)}>
            View all <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {loading
            ? [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <Skeleton key={`skeleton-f-${i}`} className="aspect-[3/4] rounded-2xl" />
              ))
            : featured.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
        </div>
      </section>

      {/* ---------- Promo banner ---------- */}
      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-10 text-primary-foreground sm:px-12 sm:py-14">
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Pay your way with MTN MoMo or Cash on Delivery
            </h2>
            <p className="mt-3 text-primary-foreground/85">
              We make it easy to shop from anywhere in Rwanda. Pay instantly
              with MTN Mobile Money, or pay with cash when your order arrives.
              Airtel Money and card payments coming soon.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => goCatalog(null)}
              >
                Start shopping
              </Button>
            </div>
          </div>
          {/* Decorative circles */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary-foreground/10" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-primary-foreground/10" />
        </div>
      </section>

      {/* ---------- New arrivals ---------- */}
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              New arrivals
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The latest additions to our shelves.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => goCatalog(null)}>
            View all <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {loading
            ? [0, 1, 2, 3].map((i) => (
                <Skeleton key={`skeleton-n-${i}`} className="aspect-[3/4] rounded-2xl" />
              ))
            : newArrivals.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
        </div>
      </section>

      {/* ---------- Testimonials ---------- */}
      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Loved by Rwandans
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Real reviews from our customers across the country.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            {
              name: "Aline M.",
              city: "Kigali",
              text: "The Vitamin C serum brightened my skin in 2 weeks. Delivery was fast — I paid with MoMo and got my order the next day.",
            },
            {
              name: "Claudine U.",
              city: "Huye",
              text: "Finally a foundation that matches my skin tone without looking ashy. The Mocha lipstick is my new everyday shade.",
            },
            {
              name: "Peace I.",
              city: "Musanze",
              text: "The hair growth oil really works. My edges are filling in after 6 weeks of use. Highly recommend!",
            },
          ].map((t, i) => (
            <div
              key={i}
              className="relative rounded-2xl border bg-card p-5 shadow-sm"
            >
              <Quote className="absolute right-4 top-4 h-8 w-8 text-primary/20" />
              <div className="flex gap-0.5">
                {[0, 1, 2, 3, 4].map((s) => (
                  <Star
                    key={s}
                    className="h-4 w-4 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground/85">
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {t.name.charAt(0)}
                </span>
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.city}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
