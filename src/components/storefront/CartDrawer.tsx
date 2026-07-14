"use client"

/**
 * Slide-out cart drawer.
 *
 * Opens automatically when a product is added to the cart.
 * Shows the cart contents in a compact format with quick quantity controls
 * and a "View cart" / "Checkout" CTA.
 *
 * Section 2: Also listens for real-time product events (out-of-stock,
 * price changes, deletions) and updates the cart accordingly.
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
import { useCartUpdates } from "@/hooks/use-realtime"
import { useToast } from "@/hooks/use-toast"
import { useT } from '@/lib/i18n/LanguageContext'

export function CartDrawer() {
  const t = useT()
  const { toast } = useToast()
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

  // ─── Section 2: Real-time cart sync ───────────────────────────────
  // When a product in the cart goes out of stock, changes price, or is
  // deleted, update the cart immediately and notify the customer.
  useCartUpdates((event, data) => {
    const p = data as { id: string; name: string; price?: number; oldPrice?: number; stock?: number }
    const cartItem = items.find((i) => i.productId === p.id)
    if (!cartItem) return // Product not in cart — ignore

    if (event === "product:outOfStock" || event === "product:deleted") {
      // Remove from cart and notify
      removeFromCart(p.id)
      toast({
        title: event === "product:deleted" ? t('product.product_removed') : t('product.out_of_stock_update'),
        description: t('cart.realtime_removed', { product: p.name }),
        variant: "destructive",
      })
    } else if (event === "product:priceChange" && p.price !== undefined) {
      // Update price in cart — we need to update the store directly
      // since there's no dedicated "updatePrice" action
      useStore.setState({
        items: useStore.getState().items.map((i) =>
          i.productId === p.id ? { ...i, price: p.price! } : i
        ),
      })
      toast({
        title: t('product.price_updated'),
        description: t('cart.price_now', { product: p.name, price: formatRWF(p.price) }),
      })
    }
  })

  return (
    <Sheet open={isCartOpen} onOpenChange={setCartOpen}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="text-primary h-5 w-5" />
            {t('cart.your_cart')}
          </SheetTitle>
          <SheetDescription>
            {items.length === 0
              ? t('cart.currently_empty')
              : t('cart.drawer_summary', { count: items.length, subtotal: formatRWF(subtotal) })}
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12">
            <div className="bg-secondary grid h-20 w-20 place-items-center rounded-full">
              <ShoppingBag className="text-primary/40 h-10 w-10" />
            </div>
            <p className="text-muted-foreground text-sm">{t('cart.empty_hint')}</p>
            <Button
              variant="outline"
              onClick={() => {
                setCartOpen(false)
                useStore.getState().goCatalog(null)
              }}
            >
              {t('cart.browse_products')}
            </Button>
          </div>
        ) : (
          <>
            {/* Items */}
            <ul className="ub-scroll flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {items.map((item) => (
                <li key={item.productId} className="bg-card flex gap-3 rounded-xl border p-2.5">
                  <button
                    onClick={() => {
                      setCartOpen(false)
                      goProduct(item.slug)
                    }}
                    className="bg-secondary/30 h-16 w-16 shrink-0 overflow-hidden rounded-lg"
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-muted-foreground grid h-full w-full place-items-center text-xs">
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
                      className="hover:text-primary line-clamp-2 text-left text-xs leading-snug font-medium sm:text-sm"
                    >
                      {item.name}
                    </button>
                    <p className="text-muted-foreground text-xs">{formatRWF(item.price)}</p>
                    <div className="mt-auto flex items-center justify-between pt-1">
                      <div className="flex items-center rounded-md border">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-r-none"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          aria-label={t('product.decrease_quantity')}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-7 text-center text-xs font-medium">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-l-none"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          aria-label={t('product.increase_quantity')}
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
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive self-start rounded-md p-1"
                    aria-label={t('cart.remove_product', { product: item.name })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>

            {/* Footer */}
            <div className="bg-card border-t p-4">
              <div className="mb-3 flex items-baseline justify-between">
                <span className="text-muted-foreground text-sm">{t('cart.subtotal')}</span>
                <span className="text-lg font-bold">{formatRWF(subtotal)}</span>
              </div>
              <p className="text-muted-foreground mb-3 text-xs">
                {t('cart.delivery_fee_checkout')}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCartOpen(false)
                    goCart()
                  }}
                >
                  {t('cart.view_cart')}
                </Button>
                <Button
                  onClick={() => {
                    setCartOpen(false)
                    goCheckout()
                  }}
                >
                  {t('checkout.title')}
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
