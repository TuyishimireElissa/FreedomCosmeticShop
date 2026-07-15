'use client'

import { useCallback, useEffect } from 'react'
import { useCartStore, type CartItem } from '@/store/cartStore'
import { useStore } from '@/store/useStore'
import { useCartSync } from '@/hooks/useCartSync'

export function useCart() {
  useCartSync()
  const store = useCartStore()
  const importLegacyItems = useCartStore((state) => state.importLegacyItems)
  useEffect(() => {
    try {
      const legacy = JSON.parse(localStorage.getItem('freedom-store') || '{}')?.state || {}
      const map = (item: Record<string, unknown>, index: number): CartItem => ({
        id: `legacy-${index}-${String(item.productId || '')}`,
        productId: String(item.productId || ''), slug: String(item.slug || ''), name: String(item.name || ''),
        price: Number(item.price || 0), quantity: Number(item.quantity || 1), maxQuantity: Number(item.stock || item.maxQuantity || 0),
        image: typeof item.image === 'string' ? item.image : undefined, bundleId: typeof item.bundleId === 'string' ? item.bundleId : undefined, isBundle: item.isBundle === true,
      })
      const items = Array.isArray(legacy.items) ? legacy.items.map(map).filter((item: CartItem) => item.productId && item.maxQuantity > 0) : []
      const saved = Array.isArray(legacy.savedItems) ? legacy.savedItems.map(map).filter((item: CartItem) => item.productId && item.maxQuantity > 0) : []
      importLegacyItems(items, saved)
    } catch {}
  }, [importLegacyItems])
  useEffect(() => {
    useStore.setState({
      items: store.items.map((item) => ({ productId: item.productId, slug: item.slug, name: item.name, price: item.price, image: item.image || '', quantity: item.quantity, stock: item.maxQuantity, bundleId: item.bundleId, isBundle: item.isBundle })),
      savedItems: store.savedItems.map((item) => ({ productId: item.productId, slug: item.slug, name: item.name, price: item.price, image: item.image || '', quantity: item.quantity, stock: item.maxQuantity, bundleId: item.bundleId, isBundle: item.isBundle })),
    })
  }, [store.items, store.savedItems])
  const addToCart = useCallback((item: Omit<CartItem, 'id'> & { id?: string }) => store.addItem(item), [store])
  const removeWithUndo = useCallback((productId: string) => store.removeItem(productId), [store])
  return {
    items: store.items,
    savedItems: store.savedItems,
    subtotal: store.getSubtotal(),
    itemCount: store.getItemCount(),
    selectedDistrict: store.selectedDistrict,
    lastRemoved: store.lastRemoved,
    isSyncing: store.isSyncing,
    lastSyncedAt: store.lastSyncedAt,
    syncError: store.syncError,
    addToCart,
    removeItem: removeWithUndo,
    undoRemove: store.undoRemove,
    updateQuantity: store.updateQuantity,
    clearCart: store.clearCart,
    saveForLater: store.saveForLater,
    moveToCart: store.moveToCart,
    removeSaved: store.removeSaved,
    setDistrict: store.setDistrict,
    isInCart: store.isInCart,
  }
}
