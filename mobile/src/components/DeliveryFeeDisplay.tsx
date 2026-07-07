/**
 * DeliveryFeeDisplay — mobile delivery fee card.
 *
 * Shows delivery fee, time, and free delivery progress.
 * Optimized for small screens.
 *
 * Usage:
 *   <DeliveryFeeDisplay district="Gasabo" orderTotal={25000} />
 */

import React, { useState, useEffect } from "react"
import { View, Text, StyleSheet, ActivityIndicator } from "react-native"
import { Truck, Clock, CheckCircle2, Sparkles } from "lucide-react-native"

interface DeliveryFeeDisplayProps {
  district: string | null
  orderTotal: number
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

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api"

// Cache calculations
const cache = new Map<string, DeliveryCalculation>()

export function DeliveryFeeDisplay({ district, orderTotal }: DeliveryFeeDisplayProps) {
  const [calculation, setCalculation] = useState<DeliveryCalculation | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!district) {
      setCalculation(null)
      return
    }

    // Round to nearest 1000 for cache
    const rounded = Math.round(orderTotal / 1000) * 1000
    const cacheKey = `${district}:${rounded}`
    const cached = cache.get(cacheKey)
    if (cached) {
      setCalculation(cached)
      return
    }

    setLoading(true)
    fetch(`${API_BASE}/delivery/calculate?district=${encodeURIComponent(district)}&orderTotal=${orderTotal}`)
      .then((r) => r.json())
      .then((d) => {
        cache.set(cacheKey, d)
        setCalculation(d)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [district, orderTotal])

  // No district selected
  if (!district) {
    return (
      <View style={[styles.container, styles.containerEmpty]}>
        <Truck color="#9ca3af" size={20} />
        <View style={styles.textContainer}>
          <Text style={styles.emptyTitle}>Delivery</Text>
          <Text style={styles.emptySubtitle}>Select your district to see delivery fee</Text>
        </View>
      </View>
    )
  }

  // Loading
  if (loading || !calculation) {
    return (
      <View style={[styles.container, styles.containerLoading]}>
        <ActivityIndicator color="#b76e79" size="small" />
        <Text style={styles.loadingText}>Calculating delivery fee...</Text>
      </View>
    )
  }

  const isFree = calculation.isFreeDelivery
  const isSameDay = calculation.isSameDay

  return (
    <View
      style={[
        styles.container,
        isFree ? styles.containerFree : isSameDay ? styles.containerSameDay : styles.containerDefault,
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, isFree ? styles.iconFree : styles.iconDefault]}>
            <Truck color={isFree ? "#10b981" : "#b76e79"} size={16} />
          </View>
          <View>
            <Text style={styles.title}>Delivery to {district}</Text>
            {isSameDay && !isFree && (
              <View style={styles.sameDayRow}>
                <CheckCircle2 color="#b76e79" size={12} />
                <Text style={styles.sameDayText}>Same Day Delivery</Text>
              </View>
            )}
            {isFree && (
              <View style={styles.freeRow}>
                <Sparkles color="#10b981" size={12} />
                <Text style={styles.freeText}>FREE Delivery!</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Fee + Time */}
      <View style={styles.feeRow}>
        <View style={styles.timeContainer}>
          <Clock color="#9ca3af" size={14} />
          <Text style={styles.timeText}>{calculation.deliveryTime}</Text>
        </View>
        {isFree ? (
          <View style={styles.freeFeeContainer}>
            <Text style={styles.feeStrikethrough}>
              {calculation.zone === "KIGALI_SAME_DAY" ? "1,000 RWF" : "3,000 RWF"}
            </Text>
            <Text style={styles.freeFee}>FREE</Text>
          </View>
        ) : (
          <Text style={styles.fee}>{calculation.feeFormatted}</Text>
        )}
      </View>

      {/* Free delivery progress */}
      {!isFree && calculation.amountNeededForFree > 0 && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            🎉 Spend {calculation.amountNeededForFree.toLocaleString()} RWF more for FREE delivery!
          </Text>
        </View>
      )}

      {/* Same-day cutoff */}
      {isSameDay && !isFree && (
        <Text style={styles.cutoffText}>⏰ Order before 2PM for same-day delivery</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
  },
  containerEmpty: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#f3e0d8",
    backgroundColor: "#fce4ec20",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  containerLoading: {
    borderWidth: 1,
    borderColor: "#f3e0d8",
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 20,
  },
  containerDefault: {
    borderWidth: 1,
    borderColor: "#f3e0d8",
    backgroundColor: "#fff",
  },
  containerSameDay: {
    borderWidth: 1.5,
    borderColor: "#b76e7940",
    backgroundColor: "#fce4ec10",
  },
  containerFree: {
    borderWidth: 1.5,
    borderColor: "#10b98140",
    backgroundColor: "#10b98110",
  },
  textContainer: {
    flex: 1,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#9ca3af",
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#9ca3af",
  },
  loadingText: {
    fontSize: 14,
    color: "#9ca3af",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  iconDefault: {
    backgroundColor: "#fce4ec",
  },
  iconFree: {
    backgroundColor: "#10b98120",
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6d3a45",
  },
  sameDayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  sameDayText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#b76e79",
  },
  freeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  freeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#10b981",
  },
  feeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontSize: 13,
    color: "#9ca3af",
  },
  fee: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#6d3a45",
  },
  freeFeeContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  feeStrikethrough: {
    fontSize: 13,
    color: "#9ca3af",
    textDecorationLine: "line-through",
  },
  freeFee: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#10b981",
  },
  progressContainer: {
    marginTop: 10,
    backgroundColor: "#b76e7910",
    borderRadius: 8,
    padding: 6,
    alignItems: "center",
  },
  progressText: {
    fontSize: 11,
    color: "#b76e79",
  },
  cutoffText: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 6,
  },
})
