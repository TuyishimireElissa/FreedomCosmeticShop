"use client"

/**
 * Product detail view — complete with all enhancements.
 *
 * Features:
 *   - Breadcrumb (Home / Category / Product)
 *   - Image gallery with zoom on hover
 *   - Brand, name, rating, reviews count
 *   - Price + compare-at strikethrough + discount badge
 *   - Stock status indicator
 *   - Skin type badge
 *   - Shades selector (for makeup)
 *   - Quantity selector
 *   - Add to cart + Buy now + Add to wishlist buttons
 *   - Share buttons (WhatsApp, Instagram, Copy link)
 *   - "Authentic Product Guarantee" badge
 *   - Delivery estimator by district
 *   - Description
 *   - Ingredients accordion
 *   - How to use section
 *   - Warnings
 *   - Reviews section
 *   - Related products
 *   - Recently viewed
 *   - Trust badges
 */

import { useEffect, useState, useRef } from "react"
import { useStore } from "@/store/useStore"
import { Product } from "@/lib/types"
import { formatRWF } from "@/lib/format"
import { ProductCard } from "./ProductCard"
import { ReviewsSection } from "./ReviewsSection"
import { RecentlyViewed } from "./RecentlyViewed"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useToast } from "@/hooks/use-toast"
import { useProductUpdates } from "@/hooks/use-realtime"
import { useT } from "@/lib/i18n/LanguageContext"
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
  Heart,
  MessageCircle,
  Instagram,
  Copy,
  Clock,
} from "lucide-react"

interface ProductDetailViewProps {
  slug: string
}

export function ProductDetailView({ slug }: ProductDetailViewProps) {
  const t = useT()
  const { goHome, goCatalog, goCheckout, addToCart } = useStore()
  const { toast } = useToast()

  const [product, setProduct] = useState<Product | null>(null)
  const [wholesalePricing, setWholesalePricing] = useState<{
    isWholesale: boolean
    tiers: Array<{ minQty: number; maxQty: number | null; pricePerUnit: number; discountPercent: number; label: string }>
    extraDiscount: number
    minWholesaleQty: number
  } | null>(null)
  const [related, setRelated] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [activeImage, setActiveImage] = useState(0)
  const [qty, setQty] = useState(1)
  const [selectedShade, setSelectedShade] = useState<string>("")
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [zoom, setZoom] = useState({ active: false, x: 0, y: 0 })
  const [deliveryDistrict, setDeliveryDistrict] = useState("Nyarugenge")
  const touchStartX = useRef(0) // For mobile swipe gesture

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setProduct(null)
    setRelated([])
    setActiveImage(0)
    setQty(1)
    setSelectedShade("")

    ;(async () => {
      try {
        const res = await fetch(`/api/products/${encodeURIComponent(slug)}`)
        if (!res.ok) throw new Error("Not found")
        const data = await res.json()
        const { wholesalePricing: wp, ...productData } = data.product
        if (cancelled) return
        setProduct(productData)
        setWholesalePricing(wp || null)
        setRelated(data.related || [])
        // Set first shade as default
        if (data.product?.shades?.length) {
          setSelectedShade(data.product.shades[0])
        }
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

  // ─── Section 2: Real-time product detail updates ──────────────────
  // When admin updates THIS product (price, stock, name, etc.), update
  // the detail view live without a page refresh. If the product is
  // deleted or deactivated, show a "no longer available" message.
  useProductUpdates((event, data) => {
    if (!product) return
    const p = data as { id: string; name: string; slug: string; price?: number; stock?: number; isActive?: boolean; featured?: boolean }

    // Only react to events for THIS product
    if (p.id !== product.id && p.slug !== product.slug) return

    if (event === "product:updated" || event === "product:priceChange" || event === "product:stockLow" || event === "product:outOfStock") {
      setProduct((prev) =>
        prev
          ? {
              ...prev,
              name: p.name ?? prev.name,
              slug: p.slug ?? prev.slug,
              price: p.price ?? prev.price,
              stock: p.stock ?? prev.stock,
              featured: p.featured ?? prev.featured,
            }
          : prev
      )
      // Show a toast for price changes
      if (event === "product:priceChange" && p.price !== undefined) {
        toast({
          title: t('product.price_updated'),
          description: `${p.name} is now ${formatRWF(p.price)}`,
        })
      }
      // Show a toast for out-of-stock
      if (event === "product:outOfStock") {
        toast({
          title: t('product.out_of_stock_update'),
          description: `${p.name} is no longer available`,
          variant: "destructive",
        })
      }
    } else if (event === "product:deleted") {
      toast({
        title: t('product.product_removed'),
        description: t('product.product_removed_hint'),
        variant: "destructive",
      })
      goCatalog()
    }
  })

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
      description: `${qty} × ${product.name}${selectedShade ? ` (${selectedShade})` : ""}`,
    })
    if (buyNow) {
      goCheckout()
    }
  }

  const handleShare = (platform: "whatsapp" | "instagram" | "copy") => {
    if (!product) return
    const url = typeof window !== "undefined" ? window.location.href : ""
    const text = `Check out this product on FreedomCosmeticShop:\n${product.name} - ${formatRWF(product.price)}\n${url}\nPay with MTN MoMo 💛`

    if (platform === "whatsapp") {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
        "_blank"
      )
    } else if (platform === "instagram") {
      // Instagram doesn't support web share URLs — copy link + show instructions
      navigator.clipboard?.writeText(url)
      toast({
        title: t('product.link_copied'),
        description: t('product.instagram_copy_hint'),
      })
    } else if (platform === "copy") {
      navigator.clipboard?.writeText(url)
      toast({ title: t('product.link_copied'), description: t('product.share_anywhere') })
    }
  }

  const handleWishlist = () => {
    setIsWishlisted((w) => !w)
    toast({
      title: isWishlisted ? "Removed from wishlist" : "Added to wishlist",
      description: product?.name,
    })
  }

  // Image zoom handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setZoom({ active: true, x, y })
  }

  // Delivery estimate based on district
  const deliveryEstimate = (() => {
    const kigaliDistricts = ["Nyarugenge", "Gasabo", "Kicukiro"]
    const isKigali = kigaliDistricts.includes(deliveryDistrict)
    return {
      days: isKigali ? "1-2 business days" : "3-5 business days",
      fee: isKigali ? 1500 : 3000,
    }
  })()

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
        <h1 className="text-2xl font-bold">{t('product.product_not_found')}</h1>
        <p className="mt-2 text-muted-foreground">
          The product you&apos;re looking for doesn&apos;t exist or is no longer available.
        </p>
        <Button className="mt-6" onClick={() => goCatalog(null)}>
          Back to catalog
        </Button>
      </div>
    )
  }

  const images = product.images || []
  const hasDiscount =
    product.compareAt !== null && product.compareAt > product.price
  const discountPercent = hasDiscount
    ? Math.round(
        ((product.compareAt! - product.price) / product.compareAt!) * 100
      )
    : 0
  const outOfStock = product.stock === 0
  const lowStock = product.stock > 0 && product.stock <= 5

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-4 flex flex-wrap items-center gap-1 text-xs text-muted-foreground sm:text-sm">
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
        <span className="line-clamp-1 text-foreground">{product.name}</span>
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
        {/* ─── Image gallery with zoom ───────────────────────────────── */}
        <div className="space-y-3">
          <div
            className="relative aspect-square overflow-hidden rounded-2xl border bg-secondary/20"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setZoom({ active: false, x: 0, y: 0 })}
            onTouchStart={(e) => {
              // Track touch start X for swipe detection
              touchStartX.current = e.touches[0].clientX
            }}
            onTouchEnd={(e) => {
              // Swipe to change images on mobile
              const touchEndX = e.changedTouches[0].clientX
              const diff = touchStartX.current - touchEndX
              if (Math.abs(diff) > 50) {
                if (diff > 0 && activeImage < images.length - 1) {
                  setActiveImage(activeImage + 1)
                } else if (diff < 0 && activeImage > 0) {
                  setActiveImage(activeImage - 1)
                }
              }
            }}
          >
            {images[activeImage] ? (
              <img
                src={images[activeImage]}
                alt={product.name}
                className="h-full w-full object-cover transition-transform duration-200"
                style={
                  zoom.active
                    ? {
                        transformOrigin: `${zoom.x}% ${zoom.y}%`,
                        transform: "scale(2)",
                      }
                    : undefined
                }
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-muted-foreground">
                No image available
              </div>
            )}
            {hasDiscount && (
              <Badge className="absolute left-3 top-3 bg-primary text-primary-foreground">
                -{discountPercent}%
              </Badge>
            )}
            {outOfStock && (
              <div className="absolute inset-0 grid place-items-center bg-background/40">
                <span className="rounded-full bg-foreground/80 px-4 py-1.5 text-sm font-semibold uppercase tracking-wider text-background">
                  Sold out
                </span>
              </div>
            )}
            {/* Zoom hint */}
            {!outOfStock && (
              <div className="absolute bottom-3 right-3 rounded-full bg-background/80 px-2.5 py-1 text-xs text-muted-foreground backdrop-blur">
                🔍 Hover to zoom
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
                    activeImage === i
                      ? "border-primary"
                      : "border-transparent hover:border-border"
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

        {/* ─── Info ──────────────────────────────────────────────────── */}
        <div className="flex flex-col">
          {product.brand?.name && (
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {product.brand.name}
            </p>
          )}
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            {product.name}
          </h1>

          {/* Rating + reviews link */}
          <button
            onClick={() => {
              document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth" })
            }}
            className="mt-2 flex items-center gap-2 text-sm hover:underline"
          >
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
            <span className="text-muted-foreground">
              ({product.reviewsCount} reviews)
            </span>
          </button>

          {/* Price */}
          <div className="mt-4 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-bold">{formatRWF(product.price)}</span>
            {hasDiscount && (
              <span className="text-base text-muted-foreground line-through">
                {formatRWF(product.compareAt!)}
              </span>
            )}
            {hasDiscount && (
              <Badge variant="secondary" className="text-xs">
                You save {formatRWF(product.compareAt! - product.price)}
              </Badge>
            )}
          </div>

          {/* Badges: stock + skin type + authentic */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {outOfStock ? (
              <Badge variant="destructive">{t('common.sold_out')}</Badge>
            ) : lowStock ? (
              <Badge className="bg-amber-100 text-amber-700">
                Only {product.stock} left!
              </Badge>
            ) : (
              <Badge className="bg-emerald-100 text-emerald-700">
                <Check className="mr-1 h-3 w-3" /> In stock
              </Badge>
            )}
            {product.skinType && product.skinType.length > 0 && (
              <Badge variant="outline" className="border-primary/30 text-primary">
                {product.skinType
                  .map((s) => s.charAt(0) + s.slice(1).toLowerCase())
                  .join(" / ")}{" "}
                skin
              </Badge>
            )}
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-700">
              <ShieldCheck className="mr-1 h-3 w-3" /> Authentic
            </Badge>
          </div>

          {/* Short description */}
          {product.shortDescription && (
            <p className="mt-4 text-sm text-foreground/85">{product.shortDescription}</p>
          )}

          {/* Shades selector */}
          {product.shades && product.shades.length > 0 && (
            <div className="mt-5">
              <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Shade: <span className="text-foreground">{selectedShade}</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {product.shades.map((shade) => (
                  <button
                    key={shade}
                    onClick={() => setSelectedShade(shade)}
                    className={`rounded-lg border-2 px-3 py-1.5 text-sm font-medium transition-colors ${
                      selectedShade === shade
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    {shade}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size */}
          {product.size && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{t('product.size_label')}:</span>
              <span className="font-medium">{product.size}</span>
            </div>
          )}

          {/* Quantity + actions */}
          <div className="mt-6 flex flex-wrap items-end gap-3">
            <div>
              <Label
                htmlFor="qty"
                className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground"
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
                  aria-label={t('product.decrease_quantity')}
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
                  onClick={() =>
                    setQty((q) => Math.min(product.stock || 1, q + 1))
                  }
                  disabled={outOfStock || qty >= product.stock}
                  aria-label={t('product.increase_quantity')}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Button
              size="lg"
              className="flex-1 min-w-[140px]"
              onClick={() => handleAddToCart(false)}
              disabled={outOfStock}
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              Add to cart
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="flex-1 min-w-[140px]"
              onClick={() => handleAddToCart(true)}
              disabled={outOfStock}
            >
              Buy now
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="px-3"
              onClick={handleWishlist}
              aria-label={t('product.add_to_wishlist')}
            >
              <Heart
                className={`h-5 w-5 ${isWishlisted ? "fill-primary text-primary" : ""}`}
              />
            </Button>
          </div>

          {/* Share buttons */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Share:
            </span>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => handleShare("whatsapp")}
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => handleShare("instagram")}
            >
              <Instagram className="h-4 w-4" /> Instagram
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => handleShare("copy")}
            >
              <Copy className="h-4 w-4" /> Copy link
            </Button>
          </div>

          {/* ─── Delivery estimator ──────────────────────────────────── */}
          <div className="mt-6 rounded-2xl border bg-secondary/30 p-4">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold">{t('product.delivery_estimator')}</h3>
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[180px]">
                <Label className="mb-1 block text-xs text-muted-foreground">
                  Your district
                </Label>
                <Select value={deliveryDistrict} onValueChange={setDeliveryDistrict}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Nyarugenge", "Gasabo", "Kicukiro", // Kigali
                      "Musanze", "Burera", "Gicumbi", "Rulindo", "Gakenke", // Northern
                      "Nyanza", "Gisagara", "Nyaruguru", "Huye", "Nyamagabe",
                      "Ruhango", "Muhanga", "Kamonyi", // Southern
                      "Rwamagana", "Nyagatare", "Gatsibo", "Kayonza", "Kirehe",
                      "Ngoma", "Bugesera", // Eastern
                      "Karongi", "Rutsiro", "Rubavu", "Nyabihu", "Ngororero",
                      "Rusizi", "Nyamasheke", // Western
                    ].map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg bg-card px-3 py-2 text-sm">
                <p className="flex items-center gap-1 font-medium">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  {deliveryEstimate.days}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Delivery fee: {formatRWF(deliveryEstimate.fee)}
                </p>
              </div>
            </div>
          </div>

          {/* Authentic Product Guarantee */}
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-50 p-3">
            <ShieldCheck className="h-8 w-8 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-900">
                Authentic Product Guarantee
              </p>
              <p className="text-xs text-emerald-700">
                100% genuine. Sourced from authorized distributors.
              </p>
            </div>
          </div>

          {/* Trust badges */}
          <div className="mt-6 grid grid-cols-1 gap-3 border-t pt-6 sm:grid-cols-3">
            <div className="flex items-start gap-2">
              <Truck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">{t('product.fast_delivery')}</p>
                <p className="text-xs text-muted-foreground">{t('product.delivery_times_short')}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">{t('product.payment_flexible')}</p>
                <p className="text-xs text-muted-foreground">{t('product.payment_methods_short')}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">{t('common.authentic')}</p>
                <p className="text-xs text-muted-foreground">{t('product.authorized_distributors')}</p>
              </div>
            </div>
            {/* NEW: Easy Returns badge */}
            <div className="flex items-start gap-2">
              <ArrowLeft className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">{t('product.easy_returns')}</p>
                <p className="text-xs text-muted-foreground">{t('product.return_policy_short')}</p>
              </div>
            </div>
            {/* NEW: Rwanda Official badge */}
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-lg shrink-0">🇷🇼</span>
              <div>
                <p className="text-sm font-medium">{t('product.officially_rwanda')}</p>
                <p className="text-xs text-muted-foreground">{t('product.local_business')}</p>
              </div>
            </div>
            {/* NEW: MTN MoMo Accepted badge */}
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-lg shrink-0">📱</span>
              <div>
                <p className="text-sm font-medium">{t('checkout.mtn_momo')}</p>
                <p className="text-xs text-muted-foreground">{t('product.pay_mobile_short')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Description + Accordions ────────────────────────────── */}
      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        {/* Description */}
        <div>
          <h2 className="text-lg font-semibold">{t('product.description')}</h2>
          <div className="prose prose-sm mt-3 max-w-none text-foreground/85">
            <p className="whitespace-pre-line leading-relaxed">{product.description}</p>
          </div>
        </div>

        {/* Accordion: ingredients, how to use, warnings */}
        <div>
          <Accordion type="single" collapsible className="w-full">
            {product.ingredients && product.ingredients.length > 0 && (
              <AccordionItem value="ingredients">
                <AccordionTrigger className="text-sm font-semibold">
                  Key ingredients
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-wrap gap-2">
                    {product.ingredients.map((ing) => (
                      <span
                        key={ing}
                        className="rounded-md border bg-secondary/40 px-2.5 py-1 text-xs font-medium"
                      >
                        {ing}
                      </span>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {product.usageInstructions && (
              <AccordionItem value="usage">
                <AccordionTrigger className="text-sm font-semibold">
                  How to use
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-foreground/85">
                    {product.usageInstructions}
                  </p>
                </AccordionContent>
              </AccordionItem>
            )}

            {product.warnings && (
              <AccordionItem value="warnings">
                <AccordionTrigger className="text-sm font-semibold">
                  Cautions &amp; warnings
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-amber-700">{product.warnings}</p>
                </AccordionContent>
              </AccordionItem>
            )}

            <AccordionItem value="shipping">
              <AccordionTrigger className="text-sm font-semibold">
                Shipping &amp; returns
              </AccordionTrigger>
              <AccordionContent>
                {/* Delivery fee table */}
                <div className="mb-3 overflow-hidden rounded-lg border">
                  <table className="w-full text-xs">
                    <thead className="bg-secondary/50 text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">{t('product.zone')}</th>
                        <th className="px-3 py-2 text-right font-medium">{t('product.fee')}</th>
                        <th className="px-3 py-2 text-right font-medium">{t('product.time')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr>
                        <td className="px-3 py-2">Kigali City</td>
                        <td className="px-3 py-2 text-right font-medium">1,000 RWF</td>
                        <td className="px-3 py-2 text-right">{t('product.same_day')}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">Northern Province</td>
                        <td className="px-3 py-2 text-right font-medium">3,000 RWF</td>
                        <td className="px-3 py-2 text-right">{t('product.days_2_3')}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">Southern Province</td>
                        <td className="px-3 py-2 text-right font-medium">3,000 RWF</td>
                        <td className="px-3 py-2 text-right">{t('product.days_2_3')}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">Eastern Province</td>
                        <td className="px-3 py-2 text-right font-medium">3,500 RWF</td>
                        <td className="px-3 py-2 text-right">{t('product.days_2_3')}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">Western Province</td>
                        <td className="px-3 py-2 text-right font-medium">4,000 RWF</td>
                        <td className="px-3 py-2 text-right">{t('product.days_3_4')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <ul className="space-y-1 text-sm text-foreground/85">
                  <li>• 🎉 {t('policies.free_delivery_summary')}</li>
                  <li>• 📦 {t('footer.all_districts')}</li>
                  <li>• 🔄 {t('product.return_policy_short')}</li>
                  <li>• 💛 {t('nav.payment_methods')}</li>
                  <li>• ✅ {t('policies.authentic_summary')}</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {/* ─── Section 4: Wholesale Pricing Table ─────────────────────── */}
      {wholesalePricing && wholesalePricing.isWholesale ? (
        <div className="mt-8 rounded-2xl border border-violet-200 bg-violet-50 p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-violet-900">
            💰 Your Wholesale Pricing
          </h3>
          <p className="mt-0.5 text-xs text-violet-700">
            Approved Wholesale Account{wholesalePricing.extraDiscount > 0 ? ` · +${wholesalePricing.extraDiscount}% extra discount` : ""}
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-violet-200 text-xs uppercase tracking-wider text-violet-700">
                  <th className="py-2 pr-3 text-left font-medium">{t('product.quantity_label')}</th>
                  <th className="py-2 pr-3 text-right font-medium">{t('product.unit_price')}</th>
                  <th className="py-2 text-right font-medium">{t('product.you_save_label')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-100">
                {wholesalePricing.tiers.map((tier, i) => {
                  const savings = product.price - tier.pricePerUnit
                  const savingsPct = product.price > 0 ? Math.round((savings / product.price) * 100) : 0
                  return (
                    <tr key={i} className={qty >= tier.minQty && (tier.maxQty === null || qty <= tier.maxQty) ? "bg-violet-100" : ""}>
                      <td className="py-2 pr-3 font-medium">
                        {tier.minQty}{tier.maxQty ? ` - ${tier.maxQty}` : "+"} units
                      </td>
                      <td className="py-2 pr-3 text-right font-bold">
                        {formatRWF(tier.pricePerUnit)}
                      </td>
                      <td className="py-2 text-right text-violet-700">
                        {savings > 0 ? `${formatRWF(savings)} (${savingsPct}%)` : "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 rounded-lg bg-violet-100 p-3 text-sm">
            <span className="text-violet-900">Quantity: {qty}</span>
            {(() => {
              // Find applicable tier
              const tier = wholesalePricing.tiers.find(
                (t) => qty >= t.minQty && (t.maxQty === null || qty <= t.maxQty)
              )
              if (tier) {
                const total = tier.pricePerUnit * qty
                return (
                  <span className="ml-2 font-bold text-violet-900">
                    → Total: {formatRWF(total)}
                    {tier.discountPercent > 0 && (
                      <span className="ml-2 text-xs text-violet-600">
                        ({tier.discountPercent}% off retail)
                      </span>
                    )}
                  </span>
                )
              }
              return <span className="ml-2 text-xs text-violet-600">Add {wholesalePricing.minWholesaleQty}+ units for wholesale pricing</span>
            })()}
          </div>
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-violet-100 bg-violet-50/50 p-4 text-center">
          <p className="text-sm font-medium text-violet-900">
            {t('product.wholesale_application_hint')}
          </p>
          <p className="mt-0.5 text-xs text-violet-700">
            {t('product.wholesale_terms_hint')}
          </p>
          <button
            onClick={() => useStore.getState().setView("wholesale" as never)}
            className="mt-2 text-xs font-medium text-violet-600 hover:underline"
          >
            {t('product.apply_wholesale')} →
          </button>
        </div>
      )}

      {/* ─── Reviews ──────────────────────────────────────────────── */}
      <div id="reviews" className="mt-12 scroll-mt-24">
        <ReviewsSection product={product} />
      </div>

      {/* ─── Related products ────────────────────────────────────── */}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-4 text-xl font-bold tracking-tight sm:text-2xl">
            You may also like
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* ─── Complete Your Routine — NEW ─────────────────────────────── */}
      {related.length > 2 && (
        <section className="mt-12">
          <h2 className="mb-1 text-xl font-bold tracking-tight sm:text-2xl">
            ✨ Complete your routine
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Complementary products that work great together
          </p>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {related.slice(0, 4).reverse().map((p) => (
              <ProductCard key={`routine-${p.id}`} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* ─── Recently viewed ──────────────────────────────────────── */}
      <RecentlyViewed currentSlug={product.slug} />
    </div>
  )
}
