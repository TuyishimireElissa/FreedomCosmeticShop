"use client"

/**
 * Product detail view.
 *
 * Shows:
 *  - Breadcrumb (Home / Category / Product)
 *  - Image gallery (main image + thumbnails)
 *  - Brand, name, rating, reviews count
 *  - Price + compare-at strikethrough + discount badge
 *  - Stock status
 *  - Quantity selector
 *  - Add to cart + Buy now buttons
 *  - Description
 *  - Trust badges (delivery, payment, authenticity)
 *  - Related products grid
 */

import { useEffect, useState } from "react"
import { useStore } from "@/store/useStore"
import { Product } from "@/lib/types"
import { formatRWF } from "@/lib/format"
import { ProductCard } from "./ProductCard"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  Star,
  Minus,
  Plus,
  ShoppingCart,
  Truck,
  ShieldCheck,
  Smartphone,
  Check,
  ChevronRight,
  ArrowLeft,
} from "lucide-react"

interface ProductDetailViewProps {
  slug: string
}

export function ProductDetailView({ slug }: ProductDetailViewProps) {
  const { goHome, goCatalog, goCheckout, addToCart } = useStore()
  const { toast } = useToast()

  const [product, setProduct] = useState<Product | null>(null)
  const [related, setRelated] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [activeImage, setActiveImage] = useState(0)
  const [qty, setQty] = useState(1)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setProduct(null)
    setRelated([])
    setActiveImage(0)
    setQty(1)

    ;(async () => {
      try {
        const res = await fetch(`/api/products/${encodeURIComponent(slug)}`)
        if (!res.ok) throw new Error("Not found")
        const data = await res.json()
        if (cancelled) return
        setProduct(data.product)
        setRelated(data.related || [])
      } catch (e) {
        console.error("Failed to load product:", e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  const handleAddToCart = (buyNow = false) => {
    if (!product) return
    if (product.stock === 0) return
    addToCart(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        image: product.images[0] || "",
        stock: product.stock,
      },
      qty
    )
    toast({
      title: buyNow ? "Proceeding to checkout" : "Added to cart",
      description: `${qty} × ${product.name}`,
    })
    if (buyNow) {
      goCheckout()
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-square rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Product not found</h1>
        <p className="text-muted-foreground mt-2">
          The product you&apos;re looking for doesn&apos;t exist or is no longer available.
        </p>
        <Button className="mt-6" onClick={() => goCatalog(null)}>
          Back to catalog
        </Button>
      </div>
    )
  }

  const images = product.images || []
  const hasDiscount = product.compareAt !== null && product.compareAt > product.price
  const discountPercent = hasDiscount
    ? Math.round(((product.compareAt! - product.price) / product.compareAt!) * 100)
    : 0
  const outOfStock = product.stock === 0
  const lowStock = product.stock > 0 && product.stock <= 5

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="text-muted-foreground mb-4 flex flex-wrap items-center gap-1 text-xs sm:text-sm">
        <button onClick={goHome} className="hover:text-primary">
          Home
        </button>
        <ChevronRight className="h-3.5 w-3.5" />
        <button
          onClick={() => goCatalog(product.category?.slug || null)}
          className="hover:text-primary"
        >
          {product.category?.name || "Catalog"}
        </button>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground line-clamp-1">{product.name}</span>
      </nav>

      {/* Back button (mobile) */}
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 lg:hidden"
        onClick={() => goCatalog(product.category?.slug || null)}
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
      </Button>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Image gallery */}
        <div className="space-y-3">
          <div className="bg-secondary/20 relative aspect-square overflow-hidden rounded-2xl border">
            {images[activeImage] ? (
              <img
                src={images[activeImage]}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="text-muted-foreground grid h-full w-full place-items-center">
                No image available
              </div>
            )}
            {hasDiscount && (
              <Badge className="bg-primary text-primary-foreground absolute top-3 left-3">
                -{discountPercent}%
              </Badge>
            )}
            {outOfStock && (
              <div className="bg-background/40 absolute inset-0 grid place-items-center">
                <span className="bg-foreground/80 text-background rounded-full px-4 py-1.5 text-sm font-semibold tracking-wider uppercase">
                  Sold out
                </span>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                    activeImage === i ? "border-primary" : "hover:border-border border-transparent"
                  }`}
                >
                  <img
                    src={img}
                    alt={`${product.name} view ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          {product.brand && (
            <p className="text-primary text-xs font-semibold tracking-wider uppercase">
              {product.brand}
            </p>
          )}
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{product.name}</h1>

          {/* Rating */}
          <div className="mt-2 flex items-center gap-2 text-sm">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-4 w-4 ${
                    s <= Math.round(product.rating)
                      ? "fill-amber-400 text-amber-400"
                      : "fill-muted text-muted"
                  }`}
                />
              ))}
            </div>
            <span className="font-medium">{product.rating.toFixed(1)}</span>
            <span className="text-muted-foreground">({product.reviews} reviews)</span>
          </div>

          {/* Price */}
          <div className="mt-4 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-bold">{formatRWF(product.price)}</span>
            {hasDiscount && (
              <span className="text-muted-foreground text-base line-through">
                {formatRWF(product.compareAt!)}
              </span>
            )}
            {hasDiscount && (
              <Badge variant="secondary" className="text-xs">
                You save {formatRWF(product.compareAt! - product.price)}
              </Badge>
            )}
          </div>

          {/* Stock */}
          <div className="mt-3 text-sm">
            {outOfStock ? (
              <span className="text-destructive font-medium">Out of stock</span>
            ) : lowStock ? (
              <span className="font-medium text-amber-600">
                Only {product.stock} left in stock — order soon!
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-medium text-emerald-600">
                <Check className="h-4 w-4" /> In stock
              </span>
            )}
          </div>

          {/* Description */}
          <div className="prose prose-sm text-foreground/85 mt-5 max-w-none">
            <p className="leading-relaxed whitespace-pre-line">{product.description}</p>
          </div>

          {/* Quantity + actions */}
          <div className="mt-6 flex flex-wrap items-end gap-3">
            <div>
              <Label
                htmlFor="qty"
                className="text-muted-foreground mb-1.5 block text-xs font-medium tracking-wider uppercase"
              >
                Quantity
              </Label>
              <div className="flex items-center rounded-lg border">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-r-none"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={outOfStock || qty <= 1}
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <input
                  id="qty"
                  type="number"
                  value={qty}
                  onChange={(e) => {
                    const n = parseInt(e.target.value) || 1
                    setQty(Math.max(1, Math.min(n, product.stock || 1)))
                  }}
                  className="h-10 w-14 border-x bg-transparent text-center text-sm font-medium outline-none"
                  min={1}
                  max={product.stock}
                  disabled={outOfStock}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-l-none"
                  onClick={() => setQty((q) => Math.min(product.stock || 1, q + 1))}
                  disabled={outOfStock || qty >= product.stock}
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Button
              size="lg"
              className="min-w-[140px] flex-1"
              onClick={() => handleAddToCart(false)}
              disabled={outOfStock}
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              Add to cart
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="min-w-[140px] flex-1"
              onClick={() => handleAddToCart(true)}
              disabled={outOfStock}
            >
              Buy now
            </Button>
          </div>

          {/* Trust badges */}
          <div className="mt-8 grid grid-cols-1 gap-3 border-t pt-6 sm:grid-cols-3">
            <div className="flex items-start gap-2">
              <Truck className="text-primary mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Fast delivery</p>
                <p className="text-muted-foreground text-xs">Kigali 1-2 days, provinces 3-5 days</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Smartphone className="text-primary mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Pay your way</p>
                <p className="text-muted-foreground text-xs">MTN MoMo or cash on delivery</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="text-primary mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-medium">100% authentic</p>
                <p className="text-muted-foreground text-xs">
                  Sourced from authorized distributors
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-4 text-xl font-bold tracking-tight sm:text-2xl">You may also like</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
