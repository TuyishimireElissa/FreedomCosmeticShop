'use client'

import { useCallback, useEffect } from 'react'
import { useCartStore, type CartItem } from '@/store/cartStore'
import { useStore } from '@/store/useStore'
import { useCartSync } from '@/hooks/useCartSync'
import { announce } from '@/components/a11y/LiveAnnouncer'
import { useT } from '@/lib/i18n/LanguageContext'
import { EVENTS, trackEvent } from '@/lib/analytics'

export function useCart() {
  useCartSync()
  const t = useT()
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
  const addToCart = useCallback((item: Omit<CartItem, 'id'> & { id?: string }) => {
    store.addItem(item)
    const current = useCartStore.getState().items.find((value) => value.productId === item.productId)
    if (current) announce(t('accessibility.cart_added', { product: current.name, quantity: current.quantity }))
    void trackEvent({ event: EVENTS.ADD_TO_CART, productId: item.productId, metadata: { source: 'button' } })
  }, [store, t])

  const removeWithUndo = useCallback((productId: string) => {
    const item = useCartStore.getState().items.find((value) => value.productId === productId)
    store.removeItem(productId)
    if (item) announce(t('accessibility.cart_removed', { product: item.name }))
    void trackEvent({ event: EVENTS.REMOVE_FROM_CART, productId, metadata: { source: 'button' } })
  }, [store, t])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    store.updateQuantity(productId, quantity)
    const item = useCartStore.getState().items.find((value) => value.productId === productId)
    if (item) announce(t('accessibility.cart_quantity', { product: item.name, quantity: item.quantity }))
  }, [store, t])

  const undoRemove = useCallback(() => {
    const removed = useCartStore.getState().lastRemoved?.item
    const restored = store.undoRemove()
    if (restored && removed) announce(t('accessibility.cart_restored', { product: removed.name }))
    return restored
  }, [store, t])

  const clearCart = useCallback(() => {
    const hadItems = useCartStore.getState().items.length > 0
    store.clearCart()
    if (hadItems) announce(t('accessibility.cart_cleared'))
  }, [store, t])

  const saveForLater = useCallback((productId: string) => {
    const item = useCartStore.getState().items.find((value) => value.productId === productId)
    store.saveForLater(productId)
    if (item) announce(t('accessibility.cart_saved_for_later', { product: item.name }))
  }, [store, t])

  const moveToCart = useCallback((productId: string) => {
    const item = useCartStore.getState().savedItems.find((value) => value.productId === productId)
    store.moveToCart(productId)
    if (item) announce(t('accessibility.cart_moved_from_saved', { product: item.name }))
  }, [store, t])

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
    undoRemove,
    updateQuantity,
    clearCart,
    saveForLater,
    moveToCart,
    removeSaved: store.removeSaved,
    setDistrict: store.setDistrict,
    isInCart: store.isInCart,
  }
}
