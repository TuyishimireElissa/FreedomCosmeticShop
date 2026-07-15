'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useStore } from '@/store/useStore'
import { useCartStore, type CartItem } from '@/store/cartStore'

const RETRY_DELAYS = [0, 1000, 2500]

type ServerCartEntry = { id?: string; productId: string; quantity: number; product: { name: string; slug: string; price: number; stock: number; compareAt?: number | null; volume?: string | null; images?: string[]; productImages?: Array<{ url: string; publicId: string; altText: string }>; brand?: { name: string } | null; category?: { slug: string } | null } }
function mapServerItem(entry: ServerCartEntry): CartItem {
  const product = entry.product
  const image = product.productImages?.[0]
  return { id: entry.id || `server-${entry.productId}`, productId: entry.productId, name: product.name, slug: product.slug, price: product.price, comparePrice: product.compareAt || undefined, quantity: entry.quantity, maxQuantity: product.stock, image: image?.url || product.images?.[0], imagePublicId: image?.publicId, imageAlt: image?.altText || product.name, volume: product.volume || undefined, brandName: product.brand?.name, categorySlug: product.category?.slug }
}

export function useCartSync() {
  const user = useStore((state) => state.user)
  const authLoading = useStore((state) => state.authLoading)
  const items = useCartStore((state) => state.items)
  const mergeServerItems = useCartStore((state) => state.mergeServerItems)
  const replaceServerProductItems = useCartStore((state) => state.replaceServerProductItems)
  const setSyncing = useCartStore((state) => state.setSyncing)
  const setSyncError = useCartStore((state) => state.setSyncError)
  const setLastSynced = useCartStore((state) => state.setLastSynced)
  const loadedUser = useRef<string | null>(null)
  const loadingServer = useRef(false)

  const loadAndMerge = useCallback(async () => {
    if (!user || loadedUser.current === user.id || loadingServer.current) return
    loadingServer.current = true
    try {
      const response = await fetch('/api/cart', { cache: 'no-store' })
      if (!response.ok) return
      const result = await response.json()
      const serverItems = result.data?.cart?.items || result.cart?.items || []
      const mapped: CartItem[] = serverItems.map((entry: ServerCartEntry) => mapServerItem(entry))
      mergeServerItems(mapped)
      loadedUser.current = user.id
    } catch {
      setSyncError('load_failed')
    } finally {
      loadingServer.current = false
    }
  }, [mergeServerItems, setSyncError, user])

  const syncToServer = useCallback(async () => {
    if (!user || loadingServer.current) return
    const productItems = items.filter((item) => !item.isBundle).map((item) => ({ productId: item.productId, quantity: item.quantity }))
    setSyncing(true)
    setSyncError(null)
    for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt += 1) {
      if (RETRY_DELAYS[attempt]) await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]))
      try {
        const response = await fetch('/api/cart/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: productItems }) })
        if (!response.ok) throw new Error()
        const result = await response.json()
        const authoritativeItems = result.data?.cart?.items || result.cart?.items || []
        const mapped = authoritativeItems.map((entry: ServerCartEntry) => mapServerItem(entry))
        const currentProducts = items.filter((item) => !item.isBundle)
        const changed = mapped.length !== currentProducts.length || mapped.some((item) => { const current = currentProducts.find((entry) => entry.productId === item.productId); return !current || current.quantity !== item.quantity || current.price !== item.price || current.maxQuantity !== item.maxQuantity })
        if (changed) replaceServerProductItems(mapped)
        setLastSynced(new Date().toISOString())
        setSyncing(false)
        return
      } catch {
        if (attempt === RETRY_DELAYS.length - 1) {
          setSyncError('sync_failed')
          setSyncing(false)
        }
      }
    }
  }, [items, replaceServerProductItems, setLastSynced, setSyncError, setSyncing, user])

  useEffect(() => {
    if (!authLoading && user) void loadAndMerge()
    if (!user) loadedUser.current = null
  }, [authLoading, loadAndMerge, user])

  useEffect(() => {
    if (!user || loadedUser.current !== user.id) return
    const timer = window.setTimeout(() => { void syncToServer() }, 2000)
    return () => window.clearTimeout(timer)
  }, [items, syncToServer, user])
}
