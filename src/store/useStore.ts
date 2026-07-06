/**
 * Zustand store for Ubumwe Beauty storefront.
 *
 * Because the sandbox preview only exposes the `/` route, all "pages" are
 * implemented as views controlled by client-side state. This store holds:
 *   - The active view + parameters (current product slug, order ID, etc.)
 *   - The shopping cart (persisted to localStorage)
 *   - The search query and admin filters
 *   - The authenticated user (not persisted — fetched via /api/auth/me on mount)
 */

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

/* ---------- Types ---------- */

export type ViewKey =
  | "home"
  | "catalog"
  | "product"
  | "cart"
  | "checkout"
  | "confirmation"
  | "admin"
  | "login"
  | "register"
  | "account"

/** Auth user type — matches the API response */
export interface AuthUser {
  id: string
  name: string
  phone: string
  email: string | null
  role: string
}

export interface CartItem {
  productId: string
  slug: string
  name: string
  price: number // RWF
  image: string
  quantity: number
  stock: number
}

interface StoreState {
  /* View navigation */
  view: ViewKey
  setView: (view: ViewKey) => void
  /** Active product slug (for product detail view) */
  activeProductSlug: string | null
  /** Last completed order ID (for confirmation view) */
  lastOrderId: string | null
  /** Catalog filters */
  catalogCategory: string | null // category slug or null for "all"
  catalogSearch: string

  /* Auth */
  user: AuthUser | null
  authLoading: boolean

  /* Cart */
  items: CartItem[]
  isCartOpen: boolean

  /* Actions: navigation */
  goHome: () => void
  goCatalog: (categorySlug?: string | null) => void
  goProduct: (slug: string) => void
  goCart: () => void
  goCheckout: () => void
  goConfirmation: (orderId: string) => void
  goAdmin: () => void
  goLogin: () => void
  goRegister: () => void
  goAccount: () => void

  /* Actions: catalog */
  setCatalogSearch: (q: string) => void
  clearCatalogSearch: () => void

  /* Actions: auth */
  fetchUser: () => Promise<void>
  setUser: (user: AuthUser | null) => void
  logout: () => void

  /* Actions: cart */
  addToCart: (item: Omit<CartItem, "quantity">, qty?: number) => void
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, qty: number) => void
  clearCart: () => void
  setCartOpen: (open: boolean) => void

  /* Derived getters */
  cartCount: () => number
  cartSubtotal: () => number
}

/* ---------- Store ---------- */

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      /* ---------- Initial state ---------- */
      view: "home",
      activeProductSlug: null,
      lastOrderId: null,
      catalogCategory: null,
      catalogSearch: "",
      user: null,
      authLoading: true,
      items: [],
      isCartOpen: false,

      /* ---------- Navigation ---------- */
      setView: (view) => {
        set({ view })
        if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
      },
      goHome: () => {
        set({ view: "home" })
        if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
      },
      goCatalog: (categorySlug = null) => {
        set({ view: "catalog", catalogCategory: categorySlug })
        if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
      },
      goProduct: (slug) => {
        set({ view: "product", activeProductSlug: slug })
        if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
      },
      goCart: () => {
        set({ view: "cart", isCartOpen: false })
        if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
      },
      goCheckout: () => {
        set({ view: "checkout", isCartOpen: false })
        if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
      },
      goConfirmation: (orderId) => {
        set({ view: "confirmation", lastOrderId: orderId })
        if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
      },
      goAdmin: () => {
        set({ view: "admin" })
        if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
      },
      goLogin: () => {
        set({ view: "login" })
        if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
      },
      goRegister: () => {
        set({ view: "register" })
        if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
      },
      goAccount: () => {
        set({ view: "account" })
        if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
      },

      /* ---------- Catalog ---------- */
      setCatalogSearch: (q) => set({ catalogSearch: q }),
      clearCatalogSearch: () => set({ catalogSearch: "" }),

      /* ---------- Auth ---------- */
      fetchUser: async () => {
        set({ authLoading: true })
        try {
          const res = await fetch("/api/auth/me")
          if (res.ok) {
            const data = await res.json()
            set({ user: data.user, authLoading: false })
          } else {
            // Try to refresh the token
            const refreshRes = await fetch("/api/auth/refresh", { method: "POST" })
            if (refreshRes.ok) {
              const refreshData = await refreshRes.json()
              set({ user: refreshData.user, authLoading: false })
            } else {
              set({ user: null, authLoading: false })
            }
          }
        } catch {
          set({ user: null, authLoading: false })
        }
      },
      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),

      /* ---------- Cart ---------- */
      addToCart: (item, qty = 1) => {
        const existing = get().items.find((i) => i.productId === item.productId)
        if (existing) {
          // Don't exceed stock
          const newQty = Math.min(existing.quantity + qty, item.stock)
          set({
            items: get().items.map((i) =>
              i.productId === item.productId ? { ...i, quantity: newQty } : i
            ),
            isCartOpen: true,
          })
        } else {
          set({
            items: [...get().items, { ...item, quantity: Math.min(qty, item.stock) }],
            isCartOpen: true,
          })
        }
      },
      removeFromCart: (productId) =>
        set({ items: get().items.filter((i) => i.productId !== productId) }),
      updateQuantity: (productId, qty) => {
        if (qty <= 0) {
          get().removeFromCart(productId)
          return
        }
        set({
          items: get().items.map((i) =>
            i.productId === productId ? { ...i, quantity: Math.min(qty, i.stock) } : i
          ),
        })
      },
      clearCart: () => set({ items: [] }),
      setCartOpen: (open) => set({ isCartOpen: open }),

      /* ---------- Derived ---------- */
      cartCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      cartSubtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    {
      name: "ubumwe-store",
      storage: createJSONStorage(() => localStorage),
      // Only persist the cart items — not transient view state or auth
      partialize: (state) => ({ items: state.items }) as StoreState,
    }
  )
)
