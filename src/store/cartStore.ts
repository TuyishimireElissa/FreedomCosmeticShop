'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export interface CartItem {
  id: string
  productId: string
  name: string
  nameRw?: string
  slug: string
  price: number
  retailPrice?: number
  wholesalePrice?: number
  comparePrice?: number
  quantity: number
  maxQuantity: number
  image?: string
  imagePublicId?: string
  imageAlt?: string
  volume?: string
  brandName?: string
  categorySlug?: string
  bundleId?: string
  isBundle?: boolean
  savedForLater?: boolean
}

interface RemovedItem {
  item: CartItem
  index: number
  timestamp: number
}

interface CartStore {
  items: CartItem[]
  savedItems: CartItem[]
  selectedDistrict: string
  lastRemoved: RemovedItem | null
  isSyncing: boolean
  lastSyncedAt: string | null
  syncError: string | null
  addItem: (item: Omit<CartItem, 'id'> & { id?: string }) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  undoRemove: () => boolean
  clearCart: () => void
  repriceItems: (isWholesale: boolean) => void
  saveForLater: (productId: string) => void
  moveToCart: (productId: string) => void
  removeSaved: (productId: string) => void
  mergeServerItems: (items: CartItem[]) => void
  replaceServerProductItems: (items: CartItem[]) => void
  importLegacyItems: (items: CartItem[], savedItems: CartItem[]) => void
  setDistrict: (district: string) => void
  setSyncing: (syncing: boolean) => void
  setSyncError: (error: string | null) => void
  setLastSynced: (time: string) => void
  getSubtotal: () => number
  getItemCount: () => number
  isInCart: (productId: string) => boolean
}

function safeQuantity(quantity: number, maximum: number) {
  if (!Number.isFinite(quantity) || !Number.isFinite(maximum) || maximum < 1) return 0
  return Math.max(1, Math.min(Math.trunc(quantity), Math.trunc(maximum)))
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [], savedItems: [], selectedDistrict: '', lastRemoved: null,
      isSyncing: false, lastSyncedAt: null, syncError: null,
      addItem: (newItem) => set((state) => {
        const quantity = safeQuantity(newItem.quantity, newItem.maxQuantity)
        if (quantity === 0) return state
        const existing = state.items.find((item) => item.productId === newItem.productId)
        if (existing) return { items: state.items.map((item) => item.productId === newItem.productId ? { ...item, ...newItem, id: item.id, quantity: safeQuantity(item.quantity + quantity, newItem.maxQuantity) } : item) }
        return { items: [...state.items, { ...newItem, id: newItem.id || `local-${Date.now()}-${newItem.productId}`, quantity }] }
      }),
      removeItem: (productId) => set((state) => {
        const index = state.items.findIndex((item) => item.productId === productId)
        if (index < 0) return state
        return { items: state.items.filter((item) => item.productId !== productId), lastRemoved: { item: state.items[index], index, timestamp: Date.now() } }
      }),
      updateQuantity: (productId, quantity) => set((state) => ({ items: state.items.map((item) => item.productId === productId ? { ...item, quantity: safeQuantity(quantity, item.maxQuantity) || item.quantity } : item) })),
      undoRemove: () => {
        const removed = get().lastRemoved
        if (!removed || Date.now() - removed.timestamp > 10_000) { set({ lastRemoved: null }); return false }
        set((state) => { const items = [...state.items]; items.splice(Math.min(removed.index, items.length), 0, removed.item); return { items, lastRemoved: null } })
        return true
      },
      clearCart: () => set({ items: [], lastRemoved: null }),
      repriceItems: (isWholesale) => set((state) => ({
        items: state.items.map((item) => ({ ...item, price: isWholesale && item.wholesalePrice ? item.wholesalePrice : item.retailPrice || item.price })),
        savedItems: state.savedItems.map((item) => ({ ...item, price: isWholesale && item.wholesalePrice ? item.wholesalePrice : item.retailPrice || item.price })),
      })),
      saveForLater: (productId) => set((state) => { const item = state.items.find((value) => value.productId === productId); if (!item) return state; return { items: state.items.filter((value) => value.productId !== productId), savedItems: [...state.savedItems.filter((value) => value.productId !== productId), { ...item, savedForLater: true }] } }),
      moveToCart: (productId) => set((state) => { const item = state.savedItems.find((value) => value.productId === productId); if (!item) return state; const existing = state.items.find((value) => value.productId === productId); const moved = { ...item, savedForLater: false }; return { savedItems: state.savedItems.filter((value) => value.productId !== productId), items: existing ? state.items.map((value) => value.productId === productId ? { ...value, quantity: safeQuantity(value.quantity + moved.quantity, moved.maxQuantity) } : value) : [...state.items, moved] } }),
      removeSaved: (productId) => set((state) => ({ savedItems: state.savedItems.filter((item) => item.productId !== productId) })),
      mergeServerItems: (serverItems) => set((state) => {
        const merged = [...state.items]
        for (const serverItem of serverItems) {
          const index = merged.findIndex((item) => item.productId === serverItem.productId)
          if (index < 0) merged.push(serverItem)
          else merged[index] = { ...serverItem, id: merged[index].id, quantity: safeQuantity(Math.max(merged[index].quantity, serverItem.quantity), serverItem.maxQuantity) }
        }
        return { items: merged }
      }),
      replaceServerProductItems: (serverItems) => set((state) => ({ items: [...state.items.filter((item) => item.isBundle), ...serverItems] })),
      importLegacyItems: (items, savedItems) => set((state) => {
        const merge = (current: CartItem[], incoming: CartItem[]) => {
          const result = [...current]
          for (const item of incoming) {
            const index = result.findIndex((value) => value.productId === item.productId)
            if (index < 0) result.push(item)
            else result[index] = { ...result[index], ...item, id: result[index].id, quantity: safeQuantity(Math.max(result[index].quantity, item.quantity), item.maxQuantity) }
          }
          return result
        }
        return { items: merge(state.items, items), savedItems: merge(state.savedItems, savedItems) }
      }),
      setDistrict: (selectedDistrict) => set({ selectedDistrict }),
      setSyncing: (isSyncing) => set({ isSyncing }),
      setSyncError: (syncError) => set({ syncError }),
      setLastSynced: (lastSyncedAt) => set({ lastSyncedAt }),
      getSubtotal: () => get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      getItemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
      isInCart: (productId) => get().items.some((item) => item.productId === productId),
    }),
    {
      name: 'fcs-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items, savedItems: state.savedItems, selectedDistrict: state.selectedDistrict }),
      version: 1,
    },
  ),
)
