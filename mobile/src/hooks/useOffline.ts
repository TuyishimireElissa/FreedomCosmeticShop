/**
 * useOffline — network status + offline cache hook.
 *
 * Uses NetInfo to detect online/offline status.
 * Falls back to cached products when offline.
 */

import { useState, useEffect, useCallback } from "react"
import { Platform } from "react-native"
import { storage } from "@/services/storage"

interface OfflineState {
  isOnline: boolean
  isOffline: boolean
  cachedProductsCount: number
}

export function useOffline() {
  const [state, setState] = useState<OfflineState>({
    isOnline: true,
    isOffline: false,
    cachedProductsCount: 0,
  })

  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    async function setupNetInfo() {
      // Dynamic import to avoid issues on web
      const NetInfo = (await import("@react-native-community/netinfo")).default

      const checkConnection = async () => {
        const netInfo = await NetInfo.fetch()
        const isOnline = netInfo.isConnected && netInfo.isInternetReachable !== false

        const cached = (await storage.getCachedProducts()) || []

        setState({
          isOnline,
          isOffline: !isOnline,
          cachedProductsCount: cached.length,
        })
      }

      // Initial check
      checkConnection()

      // Subscribe to network changes
      unsubscribe = NetInfo.addEventListener(checkConnection)
    }

    // Only run on native platforms
    if (Platform.OS !== "web") {
      setupNetInfo()
    }

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  const getCachedProducts = useCallback(async () => {
    return (await storage.getCachedProducts()) || []
  }, [])

  return {
    ...state,
    getCachedProducts,
  }
}
