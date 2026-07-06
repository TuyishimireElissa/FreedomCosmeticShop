"use client"

/**
 * Cart view.
 *
 * Features:
 *  - Empty state with CTA
 *  - Line items with image, name, price, quantity selector, line total, remove
 *  - Order summary card: subtotal, delivery fee (based on selected province),
 *    total, checkout button
 *  - "Continue shopping" link
 *  - Quantity is bounded by stock
 */

import { useState } from "react"
import { useStore } from "@/store/useStore"
import { formatRWF, RWANDAN_PROVINCES, deliveryFeeFor } from "@/lib/format"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, ShoppingCart } from "lucide-react"

export function CartView() {
  const { items, updateQuantity, removeFromCart, cartSubtotal, goCatalog, goCheckout, clearCart } =
    useStore()
  const { toast } = useToast()
  const [province, setProvince] = useState<string>("Kigali City")

  const subtotal = cartSubtotal()
  const deliveryFee = items.length > 0 ? deliveryFeeFor(province) : 0
  const total = subtotal + deliveryFee

  const handleRemove = (productId: string, name: string) => {
    removeFromCart(productId)
    toast({
      title: "Removed from cart",
      description: name,
    })
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <div className="bg-secondary mx-auto grid h-24 w-24 place-items-center rounded-full">
          <ShoppingBag className="text-primary/60 h-12 w-12" />
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">Your cart is empty</h1>
        <p className="text-muted-foreground mt-2">
          Looks like you haven&apos;t added any products yet. Let&apos;s fix that!
        </p>
        <Button size="lg" className="mt-6" onClick={() => goCatalog(null)}>
          <ShoppingCart className="mr-2 h-5 w-5" />
          Start shopping
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Your cart</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {items.length} item{items.length !== 1 ? "s" : ""} in your cart
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => goCatalog(null)}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Continue shopping
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Line items */}
        <div className="lg:col-span-2">
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.productId}
                className="bg-card flex gap-3 rounded-2xl border p-3 sm:gap-4 sm:p-4"
              >
                {/* Image */}
                <button
                  onClick={() => useStore.getState().goProduct(item.slug)}
                  className="bg-secondary/30 aspect-square w-20 shrink-0 overflow-hidden rounded-xl sm:w-28"
                >
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-muted-foreground grid h-full w-full place-items-center text-xs">
                      No image
                    </div>
                  )}
                </button>

                {/* Info + actions */}
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => useStore.getState().goProduct(item.slug)}
                      className="hover:text-primary line-clamp-2 text-left text-sm leading-snug font-medium sm:text-base"
                    >
                      {item.name}
                    </button>
                    <button
                      onClick={() => handleRemove(item.productId, item.name)}
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0 rounded-lg p-1.5"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="text-muted-foreground mt-0.5 text-xs">
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
                      <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
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

          {/* Clear cart */}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground mt-4"
            onClick={() => {
              if (window.confirm("Remove all items from your cart?")) {
                clearCart()
                toast({ title: "Cart cleared" })
              }
            }}
          >
            <Trash2 className="mr-1.5 h-4 w-4" /> Clear cart
          </Button>
        </div>

        {/* Summary */}
        <aside className="lg:col-span-1">
          <div className="bg-card sticky top-24 rounded-2xl border p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Order summary</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatRWF(subtotal)}</span>
              </div>

              {/* Province selector for delivery estimate */}
              <div>
                <label className="text-muted-foreground mb-1 block text-xs font-medium">
                  Delivery province
                </label>
                <Select value={province} onValueChange={setProvince}>
                  <SelectTrigger className="h-9">
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

              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery fee</span>
                <span className="font-medium">{formatRWF(deliveryFee)}</span>
              </div>

              <div className="border-t pt-3">
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold">{formatRWF(total)}</span>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  Including VAT. Final delivery fee confirmed at checkout.
                </p>
              </div>
            </div>

            <Button size="lg" className="mt-5 w-full" onClick={goCheckout}>
              Proceed to checkout
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={() => goCatalog(null)}
            >
              Continue shopping
            </Button>

            <p className="text-muted-foreground mt-4 text-center text-xs">
              Pay with MTN MoMo or cash on delivery
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
