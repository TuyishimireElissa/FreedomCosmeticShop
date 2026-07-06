/**
 * NotificationsScreen — in-app notification list.
 */

import React, { useEffect, useState } from "react"
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import { ChevronLeft, Bell, Package, CheckCircle2, AlertTriangle } from "lucide-react-native"

export function NotificationsScreen() {
  const navigation = useNavigation<any>()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch notifications
    setTimeout(() => {
      setNotifications([
        {
          id: "1",
          type: "ORDER_UPDATE",
          title: "Order confirmed!",
          body: "Your order UB-2026-00001 has been confirmed. We're preparing your items.",
          createdAt: new Date().toISOString(),
          isRead: false,
        },
        {
          id: "2",
          type: "PROMOTION",
          title: "Weekend sale!",
          body: "Get 15% off this weekend with code WEEKEND15.",
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          isRead: true,
        },
      ])
      setLoading(false)
    }, 1000)
  }, [])

  const getIcon = (type: string) => {
    switch (type) {
      case "ORDER_UPDATE": return Package
      case "PROMOTION": return Bell
      case "LOW_STOCK": return AlertTriangle
      default: return CheckCircle2
    }
  }

  const renderItem = ({ item }: { item: any }) => {
    const Icon = getIcon(item.type)
    return (
      <TouchableOpacity
        className={`mx-4 mb-2 rounded-xl border p-4 ${item.isRead ? "border-border bg-card" : "border-primary/30 bg-primary/5"}`}
      >
        <View className="flex-row items-start gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <Icon color="#b76e79" size={18} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-foreground">{item.title}</Text>
            <Text className="mt-0.5 text-xs text-muted-foreground">{item.body}</Text>
            <Text className="mt-1 text-xs text-muted-foreground">
              {new Date(item.createdAt).toLocaleString("en-RW", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>
          {!item.isRead && <View className="h-2 w-2 rounded-full bg-primary" />}
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <ChevronLeft color="#6d3a45" size={24} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-foreground">Notifications</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#b76e79" size="large" className="mt-8" />
      ) : notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Bell color="#b76e79" size={48} />
          <Text className="mt-4 text-base text-muted-foreground">No notifications</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 16 }}
        />
      )}
    </SafeAreaView>
  )
}
