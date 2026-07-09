/**
 * API Service — HTTP client for the FreedomCosmeticShop backend.
 *
 * Base URL: configurable via EXPO_PUBLIC_API_URL
 * Auth: JWT tokens stored in SecureStore (access + refresh)
 * Offline: caches GET responses in AsyncStorage
 */

import * as SecureStore from "expo-secure-store"
import AsyncStorage from "@react-native-async-storage/async-storage"

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api"
const CACHE_PREFIX = "@freedom_cache_"
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

// ─── Token management ────────────────────────────────────────────────────────

export async function getAccessToken(): Promise<string | null> {
  return await SecureStore.getItemAsync("ub_access_token")
}

export async function getRefreshToken(): Promise<string | null> {
  return await SecureStore.getItemAsync("ub_refresh_token")
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  await SecureStore.setItemAsync("ub_access_token", access)
  await SecureStore.setItemAsync("ub_refresh_token", refresh)
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync("ub_access_token")
  await SecureStore.deleteItemAsync("ub_refresh_token")
}

// ─── HTTP request ────────────────────────────────────────────────────────────

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  auth?: boolean // Include auth token
  cache?: boolean // Cache GET response
  cacheKey?: string
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, auth = true, cache = false, cacheKey } = options

  // Check cache for GET requests
  if (method === "GET" && cache) {
    const key = `${CACHE_PREFIX}${cacheKey || endpoint}`
    const cached = await AsyncStorage.getItem(key)
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      if (Date.now() - timestamp < CACHE_TTL) {
        return data as T
      }
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (auth) {
    const token = await getAccessToken()
    if (token) {
      headers["Cookie"] = `ub_access=${token}`
    }
  }

  // Note: In React Native, we can't use cookies directly.
  // The backend should accept Authorization header instead.
  // For this implementation, we pass the token in the header.
  if (auth) {
    const token = await getAccessToken()
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }
  }

  const config: RequestInit = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  }

  const res = await fetch(`${API_URL}${endpoint}`, config)

  // Try to refresh token on 401
  if (res.status === 401 && auth) {
    const refreshed = await tryRefreshToken()
    if (refreshed) {
      // Retry the original request
      return request<T>(endpoint, options)
    }
    await clearTokens()
    throw new Error("Session expired. Please log in again.")
  }

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed (${res.status})`)
  }

  // Cache successful GET responses
  if (method === "GET" && cache && data) {
    const key = `${CACHE_PREFIX}${cacheKey || endpoint}`
    await AsyncStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }))
  }

  return data as T
}

async function tryRefreshToken(): Promise<boolean> {
  try {
    const refreshToken = await getRefreshToken()
    if (!refreshToken) return false

    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `ub_refresh=${refreshToken}`,
      },
    })

    if (!res.ok) return false

    const data = await res.json()
    // Note: In React Native, we can't read cookies from the response.
    // The backend should return tokens in the JSON body for mobile clients.
    // For this implementation, we assume the backend returns tokens.
    if (data.accessToken && data.refreshToken) {
      await setTokens(data.accessToken, data.refreshToken)
      return true
    }
    return false
  } catch {
    return false
  }
}

// ─── API methods ─────────────────────────────────────────────────────────────

export const api = {
  // Auth
  register: (data: { name: string; phone: string; password: string; email?: string }) =>
    request<{ success: boolean; code?: string }>("/auth/register", {
      method: "POST",
      body: data,
      auth: false,
    }),

  verifyRegister: (data: { phone: string; code: string }) =>
    request<{ user: unknown }>("/auth/verify", {
      method: "POST",
      body: data,
      auth: false,
    }),

  login: (data: { phone: string; password: string }) =>
    request<{ user: unknown }>("/auth/login", {
      method: "POST",
      body: data,
      auth: false,
    }),

  logout: () => request<{ success: boolean }>("/auth/logout", { method: "POST" }),

  me: () => request<{ user: unknown }>("/auth/me"),

  // Products
  getProducts: (params?: string) =>
    request<{ products: unknown[] }>(`/products${params ? `?${params}` : ""}`, {
      cache: true,
    }),

  getProduct: (id: string) =>
    request<{ product: unknown; related: unknown[] }>(`/products/${id}`, {
      cache: true,
    }),

  // Cart & Orders
  createOrder: (data: unknown) =>
    request<{ order: unknown }>("/orders", { method: "POST", body: data }),

  getOrder: (id: string) => request<{ order: unknown }>(`/orders/${id}`),

  trackOrder: (orderNumber: string) =>
    request<{ order: unknown; timeline: unknown[] }>(`/orders/${orderNumber}/track`),

  // Payments
  initiateMomo: (data: { orderId: string; phone: string; network: "MTN" | "AIRTEL" }) =>
    request<{ success: boolean; transactionId: string }>(`/payments/momo`, {
      method: "POST",
      body: data,
    }),

  getPaymentStatus: (txId: string) =>
    request<{ status: string }>(`/payments/status/${txId}`),

  // Categories & Brands
  getCategories: () =>
    request<{ categories: unknown[] }>("/categories", { cache: true }),

  getBrands: () => request<{ brands: unknown[] }>("/brands", { cache: true }),
}
