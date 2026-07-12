"use client"

/**
 * useDelivery — custom hook for Rwanda delivery calculation.
 *
 * Features:
 *   - Fetch all districts grouped by province
 *   - Fetch sectors for a selected district
 *   - Calculate delivery fee for a district + order total
 *   - Cache results to avoid repeated API calls
 *
 * Usage:
 *   const { districts, sectors, calculation, loading } = useDelivery()
 *   calculation = useDeliveryFee("Gasabo", 25000)
 */

import { useState, useEffect } from "react"

interface DistrictsResponse {
  provinces: { province: string; districts: string[] }[]
}

interface SectorsResponse {
  district: string
  sectors: string[]
}

interface DeliveryCalculation {
  district: string
  province: string
  zone: string
  zoneName: string
  fee: number
  feeFormatted: string
  deliveryTime: string
  isFreeDelivery: boolean
  freeDeliveryThreshold: number
  amountNeededForFree: number
  message: string
  isSameDay: boolean
}

// Cache for districts (fetched once per session)
let districtsCache: DistrictsResponse | null = null
const sectorsCache = new Map<string, string[]>()
const calculationCache = new Map<string, DeliveryCalculation>()

/**
 * Fetch all 30 districts grouped by province.
 * Cached after first call.
 */
export function useRwandaDistricts() {
  const [data, setData] = useState<DistrictsResponse | null>(districtsCache)
  const [loading, setLoading] = useState(!districtsCache)

  useEffect(() => {
    if (districtsCache) {
      setData(districtsCache)
      setLoading(false)
      return
    }

    fetch("/api/delivery/districts")
      .then((r) => r.json())
      .then((d) => {
        districtsCache = d
        setData(d)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return { data, loading }
}

/**
 * Fetch sectors for a specific district.
 * Cached per district.
 */
export function useDistrictSectors(district: string | null) {
  const [sectors, setSectors] = useState<string[]>(district ? sectorsCache.get(district) || [] : [])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!district) {
      setSectors([])
      return
    }

    // Check cache
    const cached = sectorsCache.get(district)
    if (cached) {
      setSectors(cached)
      return
    }

    setLoading(true)
    fetch(`/api/delivery/sectors/${encodeURIComponent(district)}`)
      .then((r) => r.json())
      .then((d: SectorsResponse) => {
        sectorsCache.set(district, d.sectors)
        setSectors(d.sectors)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [district])

  return { sectors, loading }
}

/**
 * Calculate delivery fee for a district + order total.
 * Caches by `${district}:${orderTotal}` key.
 */
export function useDeliveryFee(district: string | null, orderTotal: number) {
  const [calculation, setCalculation] = useState<DeliveryCalculation | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!district) {
      setCalculation(null)
      return
    }

    // Round orderTotal to nearest 1000 to increase cache hits
    const roundedTotal = Math.round(orderTotal / 1000) * 1000
    const cacheKey = `${district}:${roundedTotal}`

    // Check cache
    const cached = calculationCache.get(cacheKey)
    if (cached) {
      setCalculation(cached)
      return
    }

    setLoading(true)
    fetch(`/api/delivery/calculate?district=${encodeURIComponent(district)}&orderTotal=${orderTotal}`)
      .then((r) => r.json())
      .then((d: DeliveryCalculation) => {
        calculationCache.set(cacheKey, d)
        setCalculation(d)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [district, orderTotal])

  return { calculation, loading }
}

/**
 * Combined hook for all delivery needs.
 */
export function useDelivery() {
  const { data: districtsData, loading: districtsLoading } = useRwandaDistricts()

  return {
    districtsData,
    districtsLoading,
    useDistrictSectors,
    useDeliveryFee,
  }
}
