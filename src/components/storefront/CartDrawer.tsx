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

import { useRouter } from "next/navigation"
import { useStore } from "@/store/useStore"
import { formatRWF } from "@/lib/format"
import { optimizedImageUrl } from "@/lib/cloudinary-images"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Check, Minus, Plus, Trash2, ShoppingBag, MessageCircle } from "lucide-react"
import { useCartUpdates } from "@/hooks/use-realtime"
import { useToast } from "@/hooks/use-toast"
import { useT } from '@/lib/i18n/LanguageContext'
import IconButton from '@/components/a11y/IconButton'
import WholesaleCartOrderButton from '@/components/cart/WholesaleCartOrderButton'

export function CartDrawer() {
  const t = useT()
  const router = useRouter()
  const { toast } = useToast()
  const {
    isCartOpen,
    setCartOpen,
    items,
    updateQuantity,
    removeFromCart,
    cartSubtotal,
    user,
    clearCart,
    goProduct,
  } = useStore()

  const subtotal = cartSubtotal()
  const isWholesale = user?.wholesaleStatus === 'APPROVED'

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
          i.productId === p.id
            ? isWholesale
              ? { ...i, retailPrice: p.price! }
              : { ...i, price: p.price!, retailPrice: p.price! }
            : i
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
                    aria-label={t('product.view_product', { product: item.name })}
                  >
                    {item.image ? (
                      <img
                        src={optimizedImageUrl(item.image, 80)}
                        alt={item.name}
                        loading="lazy"
                        decoding="async"
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
                    <p className="text-muted-foreground text-xs">{formatRWF(item.price)} each</p>{isWholesale && item.retailPrice && item.retailPrice > item.price && <><p className="text-[11px] text-fcs-text-muted line-through">Retail: {formatRWF(item.retailPrice)}</p><p className="text-[11px] font-semibold text-emerald-700">Save {formatRWF(item.retailPrice - item.price)} per unit</p></>}
                    <div className="mt-auto flex items-center justify-between pt-1">
                      <div className="flex items-center rounded-md border">
                        <IconButton label={`${t('product.decrease_quantity')}: ${item.name}`} icon={<Minus className="h-3 w-3" />} onClick={() => updateQuantity(item.productId, item.quantity - 1)} disabled={item.quantity <= 1} variant="ghost" className="rounded-r-none" />
                        <span className="w-7 text-center text-xs font-medium">{item.quantity}</span>
                        <IconButton label={`${t('product.increase_quantity')}: ${item.name}`} icon={<Plus className="h-3 w-3" />} onClick={() => updateQuantity(item.productId, item.quantity + 1)} disabled={item.quantity >= item.stock} variant="ghost" className="rounded-l-none" />
                      </div>
                      <span className="text-sm font-semibold">
                        {formatRWF(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                  <IconButton label={t('cart.remove_product', { product: item.name })} icon={<Trash2 className="h-3.5 w-3.5" />} variant="danger" onClick={() => removeFromCart(item.productId)} className="self-start rounded-md" />
                </li>
              ))}
            </ul>

            {/* Footer.
              * Both buttons here used to be dead. `goCart()` and `goCheckout()`
              * only set a `view` field on the store — a leftover from the
              * single-page architecture this app had before it moved to Next
              * file routing. Nothing in src/app or src/components reads `view`,
              * so tapping either one closed the drawer, scrolled to the top and
              * did nothing else. They now navigate for real.
              *
              * The store actions are left in place rather than deleted: cart
              * state is out of scope, and WholesaleDashboard still calls
              * goCart(). Fixing the call sites is enough. */}
            <div className="bg-card border-t p-4">
              <div className="mb-3 flex items-baseline justify-between">
                <span className="text-muted-foreground text-sm">{t('cart.subtotal')}</span>
                <span className="text-lg font-bold">{formatRWF(subtotal)}</span>
              </div>
              {isWholesale ? <p className="mb-3 flex items-center gap-1.5 text-xs font-bold text-emerald-700"><Check className="h-4 w-4" />Wholesale prices applied</p> : <p className="text-muted-foreground mb-3 text-xs">{t('cart.delivery_fee_checkout')}</p>}

              {isWholesale ? (
                <div className="space-y-2">
                  <Button variant="outline" className="w-full" onClick={() => { setCartOpen(false); router.push('/cart') }}>
                    {t('cart.view_cart')}
                  </Button>
                  <WholesaleCartOrderButton
                    items={items}
                    managerWhatsApp={user?.assignedManagerWhatsApp}
                    onClearCart={clearCart}
                    onNavigate={() => setCartOpen(false)}
                  />
                </div>
              ) : (
                <>
                  {/* Stacked at 360px, side by side from sm: up. The primary
                    * action sits second in the DOM so it reads last on a phone,
                    * closest to the thumb. */}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      variant="outline"
                      className="w-full border-fcs-border-subtle text-fcs-brand-text sm:flex-1"
                      onClick={() => setCartOpen(false)}
                    >
                      {t('cart.continue_shopping')}
                    </Button>

                    {/* Goes to /checkout, not straight to wa.me.
                      * /api/orders/whatsapp needs a name, phone and district to
                      * save the order, and the drawer collects none of them.
                      * Opening wa.me from here would recreate the bug where an
                      * order existed only in the customer's WhatsApp app: no FC
                      * reference, nothing in /admin/whatsapp-orders, gone if the
                      * tab closed. Checkout collects those fields and then calls
                      * the saving endpoint. Same destination, one saved path.
                      *
                      * #1E874A (--fcs-whatsapp-pill) is 4.55:1 with white text.
                      * The brief asked for #1F8A4C, which measures 4.38:1 and
                      * fails AA — computed, not assumed. */}
                    <Button
                      className="w-full bg-fcs-whatsapp-pill text-white hover:bg-fcs-whatsapp-hover sm:flex-1"
                      onClick={() => { setCartOpen(false); router.push('/checkout') }}
                    >
                      <MessageCircle className="mr-1.5 h-4 w-4" aria-hidden="true" />
                      {t('cart.order_via_whatsapp')}
                    </Button>
                  </div>

                  {/* Kept as a quieter third route: the drawer is a summary, and
                    * the full bag is where quantities, coupons and saved items
                    * live. It was equally dead before. */}
                  <button
                    type="button"
                    onClick={() => { setCartOpen(false); router.push('/cart') }}
                    className="mt-3 min-h-11 w-full text-sm font-semibold text-fcs-brand-text underline underline-offset-4"
                  >
                    {t('cart.view_cart')}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
