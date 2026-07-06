"use client"

/**
 * Ubumwe Beauty — single-page storefront entry.
 *
 * The sandbox preview only exposes the `/` route, so all "pages" are
 * implemented as views controlled by the Zustand store. The active view
 * is selected here, wrapped in a sticky-footer layout with the cart drawer.
 */

import { useStore } from "@/store/useStore"
import { Header } from "@/components/storefront/Header"
import { Footer } from "@/components/storefront/Footer"
import { CartDrawer } from "@/components/storefront/CartDrawer"
import { HomeView } from "@/components/storefront/HomeView"
import { CatalogView } from "@/components/storefront/CatalogView"
import { ProductDetailView } from "@/components/storefront/ProductDetailView"
import { CartView } from "@/components/storefront/CartView"
import { CheckoutView } from "@/components/storefront/CheckoutView"
import { ConfirmationView } from "@/components/storefront/ConfirmationView"
import { AdminView } from "@/components/admin/AdminView"

export default function Home() {
  const { view, activeProductSlug, lastOrderId } = useStore()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1">
        {view === "home" && <HomeView />}
        {view === "catalog" && <CatalogView />}
        {view === "product" && activeProductSlug && (
          <ProductDetailView slug={activeProductSlug} />
        )}
        {view === "cart" && <CartView />}
        {view === "checkout" && <CheckoutView />}
        {view === "confirmation" && lastOrderId && (
          <ConfirmationView orderId={lastOrderId} />
        )}
        {view === "admin" && <AdminView />}
      </main>

      <Footer />

      {/* Slide-out cart drawer (always mounted, opens via store state) */}
      <CartDrawer />
    </div>
  )
}
