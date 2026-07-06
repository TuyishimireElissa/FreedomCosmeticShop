/**
 * Storage Service — offline cache + secure storage.
 *
 * Uses AsyncStorage for cached data (products, cart).
 * Uses SecureStore for sensitive data (tokens, user info).
 */

import AsyncStorage from "@react-native-async-storage/async-storage"
import * as SecureStore from "expo-secure-store"

// ─── AsyncStorage (non-sensitive) ────────────────────────────────────────────

const KEYS = {
  CART: "@ubumwe_cart",
  WISHLIST: "@ubumwe_wishlist",
  RECENTLY_VIEWED: "@ubumwe_recently_viewed",
  ONBOARDING: "@ubumwe_onboarding",
  PREFERENCES: "@ubumwe_preferences",
  CACHED_PRODUCTS: "@ubumwe_cached_products",
} as const

export async function getItem<T>(key: string): Promise<T | null> {
  const value = await AsyncStorage.getItem(key)
  return value ? JSON.parse(value) : null
}

export async function setItem(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value))
}

export async function removeItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(key)
}

// ─── SecureStore (sensitive) ─────────────────────────────────────────────────

export async function getSecure(key: string): Promise<string | null> {
  return await SecureStore.getItemAsync(key)
}

export async function setSecure(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value)
}

export async function deleteSecure(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key)
}

// ─── Convenience methods ─────────────────────────────────────────────────────

export const storage = {
  // Cart
  getCart: () => getItem<(typeof KEYS)["CART"]>(KEYS.CART),
  setCart: (cart: unknown) => setItem(KEYS.CART, cart),
  clearCart: () => removeItem(KEYS.CART),

  // Wishlist
  getWishlist: () => getItem<string[]>(KEYS.WISHLIST),
  setWishlist: (ids: string[]) => setItem(KEYS.WISHLIST, ids),

  // Onboarding
  hasSeenOnboarding: async () => {
    return (await AsyncStorage.getItem(KEYS.ONBOARDING)) === "true"
  },
  setOnboardingSeen: () => AsyncStorage.setItem(KEYS.ONBOARDING, "true"),

  // Recently viewed
  getRecentlyViewed: () => getItem<string[]>(KEYS.RECENTLY_VIEWED),
  addRecentlyViewed: async (slug: string) => {
    const current = (await getItem<string[]>(KEYS.RECENTLY_VIEWED)) || []
    const updated = [slug, ...current.filter((s) => s !== slug)].slice(0, 10)
    await setItem(KEYS.RECENTLY_VIEWED, updated)
  },

  // Preferences (language, notifications, etc.)
  getPreferences: () => getItem<Record<string, unknown>>(KEYS.PREFERENCES),
  setPreferences: (prefs: Record<string, unknown>) => setItem(KEYS.PREFERENCES, prefs),

  // Cached products for offline browsing
  getCachedProducts: () => getItem<unknown[]>(KEYS.CACHED_PRODUCTS),
  setCachedProducts: (products: unknown[]) => setItem(KEYS.CACHED_PRODUCTS, products),
}
