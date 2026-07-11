'use client'
import { useStore } from '@/store/useStore'

export function useCart() {
  const items = useStore((s) => s.items)
  const cartCount = useStore((s) => s.cartCount())
  const cartSubtotal = useStore((s) => s.cartSubtotal())
  const addToCart = useStore((s) => s.addToCart)
  const removeFromCart = useStore((s) => s.removeFromCart)
  const updateQuantity = useStore((s) => s.updateQuantity)
  const clearCart = useStore((s) => s.clearCart)

  return {
    items,
    cartCount,
    cartSubtotal,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  }
}
