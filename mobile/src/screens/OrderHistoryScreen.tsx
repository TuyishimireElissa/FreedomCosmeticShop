/**
 * OrderHistoryScreen — list of user's past orders.
 */

import React, { useEffect, useState } from "react"
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import { api } from "@/services/api"
import { formatRWF } from "@/lib/format"
import { ChevronLeft, Package, ChevronRight } from "lucide-react-native"

export function OrderHistoryScreen() {
  const navigation = useNavigation<any>()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        // Fetch user's orders
        const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api"}/orders`)
        const data = await res.json()
        setOrders(data.orders || [])
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate("OrderTracking", { orderNumber: item.orderNumber })}
      className="mx-4 mb-3 rounded-xl border border-border bg-card p-4"
    >
      <View className="flex-row items-center justify-between">
        <Text className="font-mono text-sm font-bold">{item.orderNumber}</Text>
        <Text className="text-xs font-medium text-primary">{item.status}</Text>
      </View>
      <Text className="mt-1 text-xs text-muted-foreground">
        {new Date(item.createdAt).toLocaleDateString("en-RW", { day: "numeric", month: "long", year: "numeric" })}
      </Text>
      <View className="mt-2 flex-row items-center justify-between">
        <Text className="text-sm font-bold">{formatRWF(item.total)}</Text>
        <View className="flex-row items-center gap-1">
          <Text className="text-xs text-muted-foreground">{item.items.length} items</Text>
          <ChevronRight color="#9ca3af" size={14} />
        </View>
      </View>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <ChevronLeft color="#6d3a45" size={24} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-foreground">Order history</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#b76e79" size="large" className="mt-8" />
      ) : orders.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Package color="#b76e79" size={48} />
          <Text className="mt-4 text-base text-muted-foreground">No orders yet</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 16 }}
        />
      )}
    </SafeAreaView>
  )
}
