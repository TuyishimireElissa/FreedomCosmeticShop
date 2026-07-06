/**
 * OrderTrackingScreen — real-time order status timeline.
 */

import React, { useEffect, useState } from "react"
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation, useRoute } from "@react-navigation/native"
import type { RouteProp } from "@react-navigation/native"
import { api } from "@/services/api"
import { formatRWF } from "@/lib/format"
import { ChevronLeft, CheckCircle2, Package, Truck, Home as HomeIcon, Share2 } from "lucide-react-native"
import { Share } from "react-native"

export function OrderTrackingScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<RouteProp<any, any>>()
  const orderNumber = route.params?.orderNumber

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.trackOrder(orderNumber)
        setData(res)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
    // Poll every 30 seconds for updates
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [orderNumber])

  const handleShare = async () => {
    if (!data?.order) return
    await Share.share({
      message: `Order ${data.order.orderNumber} status: ${data.order.status}\nTotal: ${formatRWF(data.order.total)}`,
    })
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#b76e79" size="large" />
      </SafeAreaView>
    )
  }

  if (!data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <Text className="text-base text-muted-foreground">Order not found</Text>
      </SafeAreaView>
    )
  }

  const { order, timeline } = data

  const STATUS_ICONS: Record<string, any> = {
    PENDING: CheckCircle2,
    CONFIRMED: Package,
    SHIPPED: Truck,
    DELIVERED: HomeIcon,
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
            <ChevronLeft color="#6d3a45" size={24} />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-foreground">Track order</Text>
        </View>
        <TouchableOpacity onPress={handleShare}>
          <Share2 color="#6d3a45" size={22} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-4">
        {/* Order number + status */}
        <View className="mb-4 rounded-2xl border border-border bg-card p-4">
          <Text className="text-sm text-muted-foreground">Order number</Text>
          <Text className="text-lg font-bold text-foreground">{order.orderNumber}</Text>
          <View className="mt-2 flex-row items-center gap-2">
            <Text className="text-sm text-muted-foreground">Status:</Text>
            <Text className="text-sm font-bold text-primary">{order.status}</Text>
          </View>
        </View>

        {/* Timeline */}
        <View className="mb-4 rounded-2xl border border-border bg-card p-4">
          <Text className="mb-3 text-sm font-semibold">Timeline</Text>
          {timeline.map((step: any, i: number) => {
            const Icon = STATUS_ICONS[step.status] || Package
            return (
              <View key={step.status} className="flex-row items-start gap-3 mb-4">
                <View
                  className={`h-8 w-8 items-center justify-center rounded-full ${
                    step.completed ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <Icon color={step.completed ? "#fff" : "#9ca3af"} size={16} />
                </View>
                <View className="flex-1">
                  <Text className={`text-sm font-medium ${step.completed ? "text-foreground" : "text-muted-foreground"}`}>
                    {step.label}
                  </Text>
                  {step.timestamp && (
                    <Text className="text-xs text-muted-foreground">
                      {new Date(step.timestamp).toLocaleString("en-RW")}
                    </Text>
                  )}
                </View>
              </View>
            )
          })}
        </View>

        {/* Items */}
        <View className="mb-4 rounded-2xl border border-border bg-card p-4">
          <Text className="mb-2 text-sm font-semibold">Items ({order.items.length})</Text>
          {order.items.map((item: any) => (
            <View key={item.id} className="flex-row justify-between py-1">
              <Text className="text-sm text-foreground">{item.name} × {item.quantity}</Text>
              <Text className="text-sm font-medium">{formatRWF(item.price * item.quantity)}</Text>
            </View>
          ))}
          <View className="mt-2 border-t border-border pt-2">
            <View className="flex-row justify-between">
              <Text className="text-sm font-bold">Total</Text>
              <Text className="text-lg font-bold">{formatRWF(order.total)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
