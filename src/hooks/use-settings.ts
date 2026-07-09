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

  // Listen for real-time logo updates via SSE
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data)
        if (parsed.event === "logo:updated") {
          const data = parsed.data as { logoUrl: string | null }
          setSettings((prev) => prev ? { ...prev, logoUrl: data.logoUrl } : prev)
        }
      } catch {
        // ignore
      }
    }

    // Use the existing SSE connection (EventSource is managed by use-realtime.ts)
    // We add a custom listener for logo:updated
    if (typeof window !== "undefined") {
      // The SSE endpoint sends named events, so we listen for "logo:updated"
      window.addEventListener("logo:updated", ((e: CustomEvent) => {
        const data = e.detail as { logoUrl: string | null }
        setSettings((prev) => prev ? { ...prev, logoUrl: data.logoUrl } : prev)
      }) as EventListener)
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("logo:updated", ((e: CustomEvent) => {}) as EventListener)
      }
    }
  }, [])

  return { settings, loading, reload: load }
}
