"use client"

/**
 * Slide-out cart drawer.
 *
 * Opens automatically when a product is added to the cart.
 * Shows the cart contents in a compact format with quick quantity controls
 * and a "View cart" / "Checkout" CTA.
 */

import { useStore } from "@/store/useStore"
import { formatRWF } from "@/lib/format"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react"

export function CartDrawer() {
  const {
    isCartOpen,
    setCartOpen,
    items,
    updateQuantity,
    removeFromCart,
    cartSubtotal,
    goCart,
    goCheckout,
    goProduct,
  } = useStore()

  const subtotal = cartSubtotal()

  return (
    <Sheet open={isCartOpen} onOpenChange={setCartOpen}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Your cart
          </SheetTitle>
          <SheetDescription>
            {items.length === 0
              ? "Your cart is currently empty."
              : `${items.length} item${items.length !== 1 ? "s" : ""} · ${formatRWF(subtotal)}`}
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-secondary">
              <ShoppingBag className="h-10 w-10 text-primary/40" />
            </div>
            <p className="text-sm text-muted-foreground">
              Add some products to get started.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setCartOpen(false)
                useStore.getState().goCatalog(null)
              }}
            >
              Browse products
            </Button>
          </div>
        ) : (
          <>
            {/* Items */}
            <ul className="flex-1 space-y-3 overflow-y-auto ub-scroll px-4 py-4">
              {items.map((item) => (
                <li
                  key={item.productId}
                  className="flex gap-3 rounded-xl border bg-card p-2.5"
                >
                  <button
                    onClick={() => {
                      setCartOpen(false)
                      goProduct(item.slug)
                    }}
                    className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-secondary/30"
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
                        —
                      </div>
                    )}
                  </button>
                  <div className="flex flex-1 flex-col">
                    <button
                      onClick={() => {
                        setCartOpen(false)
                        goProduct(item.slug)
                      }}
                      className="line-clamp-2 text-left text-xs font-medium leading-snug hover:text-primary sm:text-sm"
                    >
                      {item.name}
                    </button>
                    <p className="text-xs text-muted-foreground">
                      {formatRWF(item.price)}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-1">
                      <div className="flex items-center rounded-md border">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-r-none"
                          onClick={() =>
                            updateQuantity(item.productId, item.quantity - 1)
                          }
                          disabled={item.quantity <= 1}
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-7 text-center text-xs font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-l-none"
                          onClick={() =>
                            updateQuantity(item.productId, item.quantity + 1)
                          }
                          disabled={item.quantity >= item.stock}
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="text-sm font-semibold">
                        {formatRWF(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="self-start rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>

            {/* Footer */}
            <div className="border-t bg-card p-4">
              <div className="mb-3 flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="text-lg font-bold">{formatRWF(subtotal)}</span>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                Delivery fee calculated at checkout.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCartOpen(false)
                    goCart()
                  }}
                >
                  View cart
                </Button>
                <Button
                  onClick={() => {
                    setCartOpen(false)
                    goCheckout()
                  }}
                >
                  Checkout
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
