"use client"

/**
 * CartView — enhanced cart with all Rwanda-specific features.
 *
 * Features:
 *   - Cart items with quantity +/-
 *   - Price in RWF with formatting
 *   - Remove item with undo (toast + 5s restore)
 *   - Save for later (move to savedItems)
 *   - Coupon code input (validates via /api/coupons/validate)
 *   - Order summary (subtotal, discount, delivery estimate, total)
 *   - Loyalty points redemption (1 point = 10 RWF)
 *   - WhatsApp share cart (share list with friend)
 *   - Continue shopping button
 *   - Proceed to checkout
 */

import { useState, useRef, useCallback } from "react"
import { useStore, type CartItem } from "@/store/useStore"
import {
  formatRWF,
  deliveryFeeFor,
  deliveryTimeFor,
  RWANDAN_PROVINCES,
} from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ArrowLeft,
  ArrowRight,
  Tag,
  X,
  Heart,
  MessageCircle,
  Gift,
  Check,
  Loader2,
  Undo2,
} from "lucide-react"

/** Loyalty point conversion: 1 point = 10 RWF */
const LOYALTY_POINT_VALUE = 10
const UNDO_TIMEOUT_MS = 5000

export function CartView() {
  const {
    items,
    savedItems,
    updateQuantity,
    removeFromCart,
    saveForLater,
    moveToCart,
    removeFromSaved,
    cartSubtotal,
    goCatalog,
    goCheckout,
    clearCart,
    appliedCoupon,
    setAppliedCoupon,
    clearCoupon,
    redeemPoints,
    setRedeemPoints,
    user,
  } = useStore()
  const { toast } = useToast()

  const [province, setProvince] = useState("Kigali City")
  const [couponInput, setCouponInput] = useState(appliedCoupon?.code || "")
  const [couponLoading, setCouponLoading] = useState(false)
  const [undoItem, setUndoItem] = useState<CartItem | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const subtotal = cartSubtotal()
  const baseDeliveryFee = items.length > 0 ? deliveryFeeFor(province) : 0
  const couponDiscount = appliedCoupon?.discountAmount || 0
  const freeShipping = appliedCoupon?.freeShipping || false
  const deliveryFee = freeShipping ? 0 : baseDeliveryFee
  const loyaltyDiscount = Math.min(redeemPoints * LOYALTY_POINT_VALUE, subtotal - couponDiscount)
  const total = Math.max(0, subtotal - couponDiscount - loyaltyDiscount + deliveryFee)

  // ─── Remove with undo ──────────────────────────────────────────────
  const handleRemove = useCallback(
    (item: CartItem) => {
      removeFromCart(item.productId)
      setUndoItem(item)
      toast({
        title: "Removed from cart",
        description: `${item.name} — Undo available for 5 seconds.`,
        action: undoItem ? undefined : {
          altText: "Undo",
          onClick: () => {
            // handled by undo button below
          },
        },
      })

      if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
      undoTimerRef.current = setTimeout(() => {
        setUndoItem(null)
      }, UNDO_TIMEOUT_MS)
    },
    [removeFromCart, toast, undoItem]
  )

  const handleUndo = () => {
    if (!undoItem) return
    useStore.getState().addToCart({
      productId: undoItem.productId,
      slug: undoItem.slug,
      name: undoItem.name,
      price: undoItem.price,
      image: undoItem.image,
      stock: undoItem.stock,
    })
    setUndoItem(null)
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    toast({ title: "Item restored" })
  }

  // ─── Coupon validation ─────────────────────────────────────────────
  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return
    setCouponLoading(true)
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput.trim(), subtotal }),
      })
      const data = await res.json()
      if (!res.ok || !data.valid) {
        toast({
          title: "Coupon invalid",
          description: data.error || "This coupon code is not valid.",
          variant: "destructive",
        })
        clearCoupon()
        return
      }
      setAppliedCoupon({
        code: data.coupon.code,
        type: data.coupon.type,
        value: data.coupon.value,
        discountAmount: data.discountAmount,
        freeShipping: data.freeShipping,
      })
      toast({
        title: "Coupon applied! 🎉",
        description: data.message,
      })
    } catch {
      toast({
        title: "Failed to apply coupon",
        variant: "destructive",
      })
    } finally {
      setCouponLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    clearCoupon()
    setCouponInput("")
    toast({ title: "Coupon removed" })
  }

  // ─── WhatsApp share cart ───────────────────────────────────────────
  const handleShareCart = () => {
    if (items.length === 0) return
    const lines = items.map(
      (i) => `• ${i.name} × ${i.quantity} — ${formatRWF(i.price * i.quantity)}`
    )
    const text = `🛍️ My Ubumwe Beauty cart:\n\n${lines.join("\n")}\n\nTotal: ${formatRWF(
      subtotal
    )}\n\nCheck it out at ubumwe.beauty!`
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  // ─── Loyalty redemption ────────────────────────────────────────────
  const availablePoints = user ? 100 : 0 // MVP: show 100 for demo; real = user.loyaltyPoints
  const maxRedeemablePoints = Math.floor(subtotal / LOYALTY_POINT_VALUE)

  // ─── Empty state ───────────────────────────────────────────────────
  if (items.length === 0 && savedItems.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-secondary">
          <ShoppingBag className="h-12 w-12 text-primary/60" />
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">
          Your cart is empty
        </h1>
        <p className="mt-2 text-muted-foreground">
          Looks like you haven&apos;t added any products yet. Let&apos;s fix that!
        </p>
        <Button size="lg" className="mt-6" onClick={() => goCatalog(null)}>
          <ShoppingBag className="mr-2 h-5 w-5" />
          Start shopping
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Your cart</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} item{items.length !== 1 ? "s" : ""} in your cart
            {savedItems.length > 0 && ` · ${savedItems.length} saved for later`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleShareCart} disabled={items.length === 0}>
            <MessageCircle className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">Share on WhatsApp</span>
            <span className="sm:hidden">Share</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => goCatalog(null)}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Continue shopping
          </Button>
        </div>
      </div>

      {/* Undo banner */}
      {undoItem && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="text-sm text-amber-800">
            Removed: <strong>{undoItem.name}</strong>
          </span>
          <Button variant="outline" size="sm" onClick={handleUndo}>
            <Undo2 className="mr-1.5 h-3.5 w-3.5" /> Undo
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ─── Left: Cart items + saved items ─────────────────────── */}
        <div className="lg:col-span-2">
          {items.length > 0 ? (
            <ul className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.productId}
                  className="flex gap-3 rounded-2xl border bg-card p-3 sm:gap-4 sm:p-4"
                >
                  {/* Image */}
                  <button
                    onClick={() => useStore.getState().goProduct(item.slug)}
                    className="aspect-square w-20 shrink-0 overflow-hidden rounded-xl bg-secondary/30 sm:w-28"
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
                        No image
                      </div>
                    )}
                  </button>

                  {/* Info + actions */}
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => useStore.getState().goProduct(item.slug)}
                        className="line-clamp-2 text-left text-sm font-medium leading-snug hover:text-primary sm:text-base"
                      >
                        {item.name}
                      </button>
                      <div className="flex gap-1">
                        <button
                          onClick={() => saveForLater(item.productId)}
                          className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary"
                          aria-label={`Save ${item.name} for later`}
                          title="Save for later"
                        >
                          <Heart className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleRemove(item)}
                          className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Remove ${item.name}`}
                          title="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatRWF(item.price)} each
                    </p>

                    <div className="mt-auto flex items-end justify-between pt-2">
                      {/* Qty selector */}
                      <div className="flex items-center rounded-lg border">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-r-none"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-10 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-l-none"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <p className="text-sm font-semibold sm:text-base">
                        {formatRWF(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-2xl border border-dashed py-12 text-center">
              <p className="text-sm text-muted-foreground">Your cart is empty.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => goCatalog(null)}>
                Browse products
              </Button>
            </div>
          )}

          {/* Clear cart */}
          {items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 text-muted-foreground"
              onClick={() => {
                if (window.confirm("Remove all items from your cart?")) {
                  clearCart()
                  toast({ title: "Cart cleared" })
                }
              }}
            >
              <Trash2 className="mr-1.5 h-4 w-4" /> Clear cart
            </Button>
          )}

          {/* ─── Saved for later ─────────────────────────────────── */}
          {savedItems.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <Heart className="h-5 w-5 text-primary" />
                Saved for later ({savedItems.length})
              </h2>
              <ul className="space-y-2">
                {savedItems.map((item) => (
                  <li
                    key={item.productId}
                    className="flex items-center gap-3 rounded-xl border bg-card p-3"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-secondary/30">
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="line-clamp-1 text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatRWF(item.price)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => moveToCart(item.productId)}
                    >
                      Move to cart
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeFromSaved(item.productId)}
                      aria-label="Remove from saved"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ─── Right: Order summary ──────────────────────────────── */}
        <aside className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            {/* Coupon */}
            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                <Tag className="h-4 w-4 text-primary" /> Coupon code
              </h2>
              {appliedCoupon ? (
                <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" />
                    <div>
                      <p className="text-sm font-medium text-emerald-900">
                        {appliedCoupon.code}
                      </p>
                      <p className="text-xs text-emerald-700">
                        {appliedCoupon.freeShipping
                          ? "Free shipping"
                          : `−${formatRWF(appliedCoupon.discountAmount)}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="rounded p-1 text-emerald-700 hover:bg-emerald-100"
                    aria-label="Remove coupon"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <Input
                    placeholder="e.g. WELCOME10"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    className="h-9"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleApplyCoupon()
                    }}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponInput.trim()}
                  >
                    {couponLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Apply"
                    )}
                  </Button>
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Try: <button onClick={() => setCouponInput("WELCOME10")} className="font-mono font-medium text-primary hover:underline">WELCOME10</button> or <button onClick={() => setCouponInput("WEEKEND15")} className="font-mono font-medium text-primary hover:underline">WEEKEND15</button>
              </p>
            </div>

            {/* Loyalty redemption */}
            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                <Gift className="h-4 w-4 text-primary" /> Loyalty points
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {availablePoints} points available · 1 pt = {formatRWF(LOYALTY_POINT_VALUE)}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={Math.min(availablePoints, maxRedeemablePoints)}
                  value={redeemPoints}
                  onChange={(e) =>
                    setRedeemPoints(
                      Math.min(
                        Math.max(0, parseInt(e.target.value) || 0),
                        availablePoints,
                        maxRedeemablePoints
                      )
                    )
                  }
                  className="h-9"
                  placeholder="0"
                  disabled={availablePoints === 0}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRedeemPoints(Math.min(availablePoints, maxRedeemablePoints))}
                  disabled={availablePoints === 0}
                >
                  Use max
                </Button>
              </div>
              {redeemPoints > 0 && (
                <p className="mt-2 text-xs font-medium text-emerald-600">
                  −{formatRWF(redeemPoints * LOYALTY_POINT_VALUE)} applied
                </p>
              )}
              {!user && (
                <p className="mt-2 text-xs text-muted-foreground">
                  💡 Log in to earn and redeem points.
                </p>
              )}
            </div>

            {/* Order summary */}
            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Order summary</h2>

              {/* Province for delivery estimate */}
              <div className="mt-4">
                <Label className="text-xs text-muted-foreground">Delivery province</Label>
                <Select value={province} onValueChange={setProvince}>
                  <SelectTrigger className="h-9 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RWANDAN_PROVINCES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal ({items.length} items)</span>
                  <span className="font-medium">{formatRWF(subtotal)}</span>
                </div>

                {couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Coupon discount</span>
                    <span>−{formatRWF(couponDiscount)}</span>
                  </div>
                )}

                {loyaltyDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Loyalty ({redeemPoints} pts)</span>
                    <span>−{formatRWF(loyaltyDiscount)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery fee</span>
                  {freeShipping ? (
                    <span className="font-medium text-emerald-600">FREE</span>
                  ) : (
                    <span className="font-medium">{formatRWF(deliveryFee)}</span>
                  )}
                </div>

                <div className="border-t pt-2">
                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="text-xl font-bold">{formatRWF(total)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    ETA: {deliveryTimeFor(province)}
                  </p>
                </div>
              </div>

              <Button size="lg" className="mt-5 w-full" onClick={goCheckout} disabled={items.length === 0}>
                Proceed to checkout
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() => goCatalog(null)}
              >
                Continue shopping
              </Button>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <span>🔒 Secure checkout</span>
                <span>·</span>
                <span>📱 MTN MoMo</span>
                <span>·</span>
                <span>💵 COD</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
