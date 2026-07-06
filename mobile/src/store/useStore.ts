/**
 * Zustand store — auth state, cart, wishlist, preferences.
 *
 * Persisted to AsyncStorage + SecureStore.
 */

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { api, setTokens, clearTokens, getAccessToken } from "@/services/api"
import { storage } from "@/services/storage"

export interface User {
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
  price: number
  image: string
  quantity: number
  stock: number
}

interface StoreState {
  // Auth
  user: User | null
  isAuthenticated: boolean
  hasSeenOnboarding: boolean
  authLoading: boolean

  // Cart
  cart: CartItem[]
  wishlist: string[] // product IDs

  // Actions
  restoreSession: () => Promise<void>
  setUser: (user: User | null) => void
  login: (phone: string, password: string) => Promise<void>
  logout: () => Promise<void>
  completeOnboarding: () => void

  // Cart actions
  addToCart: (item: Omit<CartItem, "quantity">, qty?: number) => void
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, qty: number) => void
  clearCart: () => void
  cartCount: () => number
  cartSubtotal: () => number

  // Wishlist actions
  toggleWishlist: (productId: string) => void
  isInWishlist: (productId: string) => boolean
}

export const useAuthStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      hasSeenOnboarding: false,
      authLoading: true,
      cart: [],
      wishlist: [],

      // ─── Auth ──────────────────────────────────────────────────────
      restoreSession: async () => {
        set({ authLoading: true })
        try {
          const token = await getAccessToken()
          if (!token) {
            set({ user: null, isAuthenticated: false, authLoading: false })
            return
          }

          const data = await api.me()
          set({ user: data.user as User, isAuthenticated: true, authLoading: false })
        } catch {
          set({ user: null, isAuthenticated: false, authLoading: false })
        }
      },

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      login: async (phone, password) => {
        const data = await api.login({ phone, password })
        set({ user: data.user as User, isAuthenticated: true })
      },

      logout: async () => {
        try {
          await api.logout()
        } catch {
          // ignore
        }
        await clearTokens()
        set({ user: null, isAuthenticated: false })
      },

      completeOnboarding: () => {
        storage.setOnboardingSeen()
        set({ hasSeenOnboarding: true })
      },

      // ─── Cart ──────────────────────────────────────────────────────
      addToCart: (item, qty = 1) => {
        const existing = get().cart.find((i) => i.productId === item.productId)
        if (existing) {
          const newQty = Math.min(existing.quantity + qty, item.stock)
          set({
            cart: get().cart.map((i) =>
              i.productId === item.productId ? { ...i, quantity: newQty } : i
            ),
          })
        } else {
          set({
            cart: [...get().cart, { ...item, quantity: Math.min(qty, item.stock) }],
          })
        }
        storage.setCart(get().cart)
      },

      removeFromCart: (productId) => {
        set({ cart: get().cart.filter((i) => i.productId !== productId) })
        storage.setCart(get().cart)
      },

      updateQuantity: (productId, qty) => {
        if (qty <= 0) {
          get().removeFromCart(productId)
          return
        }
        set({
          cart: get().cart.map((i) =>
            i.productId === productId ? { ...i, quantity: Math.min(qty, i.stock) } : i
          ),
        })
        storage.setCart(get().cart)
      },

      clearCart: () => {
        set({ cart: [] })
        storage.clearCart()
      },

      cartCount: () => get().cart.reduce((sum, i) => sum + i.quantity, 0),
      cartSubtotal: () => get().cart.reduce((sum, i) => sum + i.price * i.quantity, 0),

      // ─── Wishlist ──────────────────────────────────────────────────
      toggleWishlist: (productId) => {
        const current = get().wishlist
        const updated = current.includes(productId)
          ? current.filter((id) => id !== productId)
          : [...current, productId]
        set({ wishlist: updated })
        storage.setWishlist(updated)
      },

      isInWishlist: (productId) => get().wishlist.includes(productId),
    }),
    {
      name: "ubumwe-mobile-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        cart: state.cart,
        wishlist: state.wishlist,
        hasSeenOnboarding: state.hasSeenOnboarding,
      }) as StoreState,
    }
  )
)
