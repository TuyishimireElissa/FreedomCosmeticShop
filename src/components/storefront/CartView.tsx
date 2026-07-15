"use client"

/**
 * CartView — enhanced cart with all Rwanda-specific features.
 *
 * Features:
 *   - Cart items with quantity +/- controls
 *   - Price in RWF with formatting
 *   - Remove item with UNDO (toast with undo button, 5-second window)
 *   - Save for later (moves to savedItems, can move back)
 *   - Coupon code input (validates via /api/coupons/validate)
 *   - Order summary (subtotal, discount, delivery estimate, total)
 *   - Loyalty points redemption (1 point = 1 RWF)
 *   - WhatsApp share cart (generates a shareable message)
 *   - Continue shopping button
 *   - Proceed to checkout button
 *   - Empty state with CTA
 */

import { useState, useEffect } from "react"
import { useStore } from "@/store/useStore"
import { formatRWF, deliveryFeeFor } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useT } from '@/lib/i18n/LanguageContext'
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ArrowLeft,
  ArrowRight,
  ShoppingCart,
  Heart,
  Tag,
  Gift,
  MessageCircle,
  Loader2,
  X,
} from "lucide-react"

// Province options for delivery estimate in cart
const PROVINCES = [
  "Kigali City",
  "Northern Province",
  "Southern Province",
  "Eastern Province",
  "Western Province",
]

export function CartView() {
  const t = useT()
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
  const [couponCode, setCouponCode] = useState(appliedCoupon?.code || "")
  const [couponLoading, setCouponLoading] = useState(false)
  const [undoTimer, setUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  const subtotal = cartSubtotal()

  // Calculate discount
  const couponDiscount = appliedCoupon?.discountAmount || 0
  const loyaltyDiscount = Math.min(redeemPoints, Math.max(0, subtotal - couponDiscount))
  const totalDiscount = couponDiscount + loyaltyDiscount
  const deliveryFee = items.length > 0 ? deliveryFeeFor(province) : 0
  const finalDeliveryFee = appliedCoupon?.freeShipping ? 0 : deliveryFee
  const total = Math.max(0, subtotal - totalDiscount + finalDeliveryFee)

  // Cleanup undo timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimer) clearTimeout(undoTimer)
    }
  }, [undoTimer])

  // ─── Remove with undo ────────────────────────────────────────────
  const handleRemove = (item: typeof items[0]) => {
    removeFromCart(item.productId)

    if (undoTimer) clearTimeout(undoTimer)
    const timer = setTimeout(() => {
      if (undoTimer) clearTimeout(undoTimer)
    }, 5000)
    setUndoTimer(timer)

    toast({
      title: t('cart.removed_from_cart'),
      description: item.name,
      action: (
        <button
          className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          onClick={() => {
            useStore.getState().addToCart({
              productId: item.productId,
              slug: item.slug,
              name: item.name,
              price: item.price,
              image: item.image,
              stock: item.stock,
            }, item.quantity)
            if (undoTimer) clearTimeout(undoTimer)
          }}
        >
          {t('cart.undo')}
        </button>
      ),
    })
  }

  // ─── Coupon validation ───────────────────────────────────────────
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, subtotal }),
      })
      const data = await res.json()
      if (!res.ok || !data.valid) {
        toast({
          title: t('cart.invalid_coupon'),
          description: data.error,
          variant: "destructive",
        })
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
        title: t('cart.coupon_applied_title'),
        description: data.message,
      })
    } catch {
      toast({ title: t('cart.coupon_validation_failed'), variant: "destructive" })
    } finally {
      setCouponLoading(false)
    }
  }

  // ─── WhatsApp share cart ─────────────────────────────────────────
  const handleShareCart = () => {
    const message = t('cart.share_message', {
      items: items.map((i) => `• ${i.name} × ${i.quantity} — ${formatRWF(i.price * i.quantity)}`).join("\n"),
      subtotal: formatRWF(subtotal),
    })
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(url, "_blank")
  }

  // ─── Empty cart state ────────────────────────────────────────────
  if (items.length === 0 && savedItems.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-secondary">
          <ShoppingBag className="h-12 w-12 text-primary/60" />
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">
          {t('cart.empty')}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {t('cart.empty_friendly_hint')}
        </p>
        <Button size="lg" className="mt-6" onClick={() => goCatalog(null)}>
          <ShoppingCart className="mr-2 h-5 w-5" /> {t('cart.start_shopping')}
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('cart.your_cart')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('cart.items_in_cart', { count: items.length })}
            {savedItems.length > 0 && ` · ${t('cart.saved_count', { count: savedItems.length })}`}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => goCatalog(null)}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> {t('cart.continue_shopping')}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ─── Cart items ────────────────────────────────────────── */}
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
                        {t('product.no_image')}
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
                          aria-label={t('cart.save_product_later', { product: item.name })}
                          title={t('cart.save_for_later')}
                        >
                          <Heart className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleRemove(item)}
                          className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label={t('cart.remove_product', { product: item.name })}
                          title={t('cart.remove')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t('cart.price_each', { price: formatRWF(item.price) })}
                    </p>

                    <div className="mt-auto flex items-end justify-between pt-2">
                      {/* Qty selector */}
                      <div className="flex items-center rounded-lg border">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 rounded-r-none"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          aria-label={t('product.decrease_quantity')}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-10 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 rounded-l-none"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          aria-label={t('product.increase_quantity')}
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
              <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                {t('cart.empty_or_restore')}
              </p>
            </div>
          )}

          {/* WhatsApp share + clear cart */}
          {items.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleShareCart}>
                <MessageCircle className="mr-1.5 h-4 w-4" /> {t('cart.share_whatsapp')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => {
                  if (window.confirm(t('cart.clear_confirm'))) {
                    clearCart()
                    toast({ title: t('cart.cleared') })
                  }
                }}
              >
                <Trash2 className="mr-1.5 h-4 w-4" /> {t('cart.clear_cart')}
              </Button>
            </div>
          )}

          {/* ─── Saved for later ──────────────────────────────────── */}
          {savedItems.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-lg font-semibold">
                {t('cart.saved_for_later_count', { count: savedItems.length })}
              </h2>
              <ul className="space-y-2">
                {savedItems.map((item) => (
                  <li
                    key={item.productId}
                    className="flex items-center gap-3 rounded-xl border bg-secondary/20 p-3"
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
                      {t('cart.move_to_cart')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 text-muted-foreground hover:text-destructive"
                      onClick={() => removeFromSaved(item.productId)}
                      aria-label={t('cart.remove_from_saved')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ─── Order summary sidebar ──────────────────────────────── */}
        <aside className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            {/* Coupon */}
            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                <Tag className="h-4 w-4 text-primary" /> {t('cart.coupon')}
              </h2>
              {appliedCoupon ? (
                <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-emerald-700">
                      {t('cart.code_applied', { code: appliedCoupon.code })}
                    </p>
                    {appliedCoupon.discountAmount > 0 && (
                      <p className="text-xs text-emerald-600">
                        −{formatRWF(appliedCoupon.discountAmount)}
                      </p>
                    )}
                    {appliedCoupon.freeShipping && (
                      <p className="text-xs text-emerald-600">{t('cart.free_shipping')}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      clearCoupon()
                      setCouponCode("")
                      toast({ title: t('cart.coupon_removed') })
                    }}
                    className="rounded-md p-1 text-emerald-700 hover:bg-emerald-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <Input
                    placeholder={t('cart.coupon_example', { code: 'WELCOME10' })}
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="h-9"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleApplyCoupon()
                    }}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                  >
                    {couponLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t('cart.apply_coupon')
                    )}
                  </Button>
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                {t('cart.coupon_suggestions')}
              </p>
            </div>

            {/* Loyalty points */}
            {user && (
              <div className="rounded-2xl border bg-card p-4 shadow-sm">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                  <Gift className="h-4 w-4 text-primary" /> {t('cart.loyalty_points')}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('cart.points_balance', { points: 0 })}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder={t('cart.points_redeem_placeholder')}
                    value={redeemPoints || ""}
                    onChange={(e) => setRedeemPoints(Number(e.target.value) || 0)}
                    className="h-9"
                    min="0"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRedeemPoints(0)}
                    disabled={redeemPoints === 0}
                  >
                    {t('common.clear')}
                  </Button>
                </div>
                {redeemPoints > 0 && (
                  <p className="mt-1 text-xs text-emerald-600">
                    −{t('cart.amount_applied', { amount: formatRWF(loyaltyDiscount) })}
                  </p>
                )}
              </div>
            )}

            {/* Order summary */}
            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <h2 className="text-sm font-semibold">{t('checkout.order_summary')}</h2>

              {/* Province selector for delivery estimate */}
              <div className="mt-3">
                <Label className="mb-1 block text-xs text-muted-foreground">
                  {t('cart.delivery_province_estimate')}
                </Label>
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
                >
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Totals */}
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('cart.subtotal')}</span>
                  <span className="font-medium">{formatRWF(subtotal)}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>{t('cart.coupon_discount')}</span>
                    <span className="font-medium">−{formatRWF(couponDiscount)}</span>
                  </div>
                )}
                {loyaltyDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>{t('cart.loyalty_points')}</span>
                    <span className="font-medium">−{formatRWF(loyaltyDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('checkout.delivery_fee')}</span>
                  {finalDeliveryFee === 0 && appliedCoupon?.freeShipping ? (
                    <span className="font-medium text-emerald-600">{t('common.free')}</span>
                  ) : (
                    <span className="font-medium">{formatRWF(finalDeliveryFee)}</span>
                  )}
                </div>
                <div className="border-t pt-2">
                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold">{t('cart.total')}</span>
                    <span className="text-xl font-bold">{formatRWF(total)}</span>
                  </div>
                </div>
              </div>

              <Button
                size="lg"
                className="mt-4 w-full"
                onClick={goCheckout}
                disabled={items.length === 0}
              >
                {t('cart.checkout')} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() => goCatalog(null)}
              >
                {t('cart.continue_shopping')}
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
