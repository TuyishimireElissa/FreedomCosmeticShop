"use client"

/**
 * useSettings — fetches store settings (logo, name, colors, etc.)
 * Listens for real-time "logo:updated" SSE events to update instantly.
 */

import { useState, useEffect, useCallback } from "react"

export interface StoreSettings {
  storeName: string
  storeShortName: string
  storeTagline: string | null
  logoUrl: string | null
  storeEmail: string | null
  storePhone: string | null
  storeWhatsApp: string | null
  storeAddress: string | null
}

export function useSettings() {
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/store")
      if (!res.ok) return
      const data = await res.json()
      setSettings(data.settings)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // The shared realtime client emits a CustomEvent with the new logo URL.
  useEffect(() => {
    const onLogoUpdated: EventListener = (event) => {
      const data = (event as CustomEvent<{ logoUrl: string | null }>).detail
      if (!data) return
      setSettings((previous) => previous ? { ...previous, logoUrl: data.logoUrl } : previous)
    }
    window.addEventListener("logo:updated", onLogoUpdated)
    return () => window.removeEventListener("logo:updated", onLogoUpdated)
  }, [])

  return { settings, loading, reload: load }
}
