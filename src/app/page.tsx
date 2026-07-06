"use client"

/**
 * Ubumwe Beauty — single-page storefront entry.
 *
 * The sandbox preview only exposes the `/` route, so all "pages" are
 * implemented as views controlled by the Zustand store. The active view
 * is selected here, wrapped in a sticky-footer layout with the cart drawer.
 *
 * On mount, we fetch the current user (via httpOnly cookies) to restore
 * the auth session.
 */

import { useEffect } from "react"
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
import { LoginView } from "@/components/auth/LoginView"
import { RegisterView } from "@/components/auth/RegisterView"
import { AccountView } from "@/components/auth/AccountView"
import { TrackOrderView } from "@/components/storefront/TrackOrderView"
import { WhatsAppButton } from "@/components/ui/WhatsAppButton"

export default function Home() {
  const { view, activeProductSlug, lastOrderId, fetchUser } = useStore()

  // Fetch the current user on mount (restores session via cookies)
  useEffect(() => {
    fetchUser()
  }, [fetchUser])

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
        {view === "trackOrder" && <TrackOrderView />}
        {view === "admin" && <AdminView />}
        {view === "login" && <LoginView />}
        {view === "register" && <RegisterView />}
        {view === "account" && <AccountView />}
      </main>

      {/* Hide footer on auth pages for a cleaner look */}
      {view !== "login" && view !== "register" && <Footer />}

      {/* Slide-out cart drawer (always mounted, opens via store state) */}
      <CartDrawer />

      {/* Floating WhatsApp button (hidden on auth pages) */}
      {view !== "login" && view !== "register" && (
        <WhatsAppButton phone="250788123456" />
      )}
    </div>
  )
}
