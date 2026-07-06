/**
 * AccountScreen — user profile + menu navigation.
 */

import React from "react"
import { View, Text, TouchableOpacity, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import { useAuthStore } from "@/store/useStore"
import { useBiometric } from "@/hooks/useBiometric"
import {
  Package,
  Heart,
  Bell,
  Settings as SettingsIcon,
  LogOut,
  ChevronRight,
  Fingerprint,
  ShieldCheck,
  Phone,
  Mail,
} from "lucide-react-native"

export function AccountScreen() {
  const navigation = useNavigation<any>()
  const { user, logout } = useAuthStore()
  const { supported, saveCredentials } = useBiometric()

  const menu = [
    { icon: Package, label: "Order history", action: () => navigation.navigate("OrderHistory") },
    { icon: Heart, label: "Wishlist", action: () => navigation.navigate("WishlistTab") },
    { icon: Bell, label: "Notifications", action: () => navigation.navigate("Notifications") },
    { icon: SettingsIcon, label: "Settings", action: () => navigation.navigate("Settings") },
  ]

  const handleLogout = async () => {
    await logout()
  }

  const handleEnableBiometric = async () => {
    await saveCredentials(user?.phone || "", "")
  }

  const initials = user?.name?.charAt(0).toUpperCase() || "U"

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile header */}
        <View className="items-center py-8">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-primary">
            <Text className="text-2xl font-bold text-white">{initials}</Text>
          </View>
          <Text className="mt-3 text-xl font-bold text-foreground">{user?.name}</Text>
          <Text className="text-sm text-muted-foreground">{user?.phone}</Text>
          {user?.email && (
            <Text className="text-sm text-muted-foreground">{user.email}</Text>
          )}
        </View>

        {/* Menu */}
        <View className="mx-4 mb-4 rounded-2xl border border-border bg-card">
          {menu.map((item, i) => (
            <TouchableOpacity
              key={i}
              onPress={item.action}
              className={`flex-row items-center justify-between p-4 ${i < menu.length - 1 ? "border-b border-border" : ""}`}
            >
              <View className="flex-row items-center gap-3">
                <item.icon color="#b76e79" size={20} />
                <Text className="text-sm font-medium text-foreground">{item.label}</Text>
              </View>
              <ChevronRight color="#9ca3af" size={18} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Biometric setup */}
        {supported && (
          <TouchableOpacity
            onPress={handleEnableBiometric}
            className="mx-4 mb-4 flex-row items-center gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <Fingerprint color="#b76e79" size={20} />
            <View className="flex-1">
              <Text className="text-sm font-medium text-foreground">Enable fingerprint login</Text>
              <Text className="text-xs text-muted-foreground">Login faster with biometrics</Text>
            </View>
            <ChevronRight color="#9ca3af" size={18} />
          </TouchableOpacity>
        )}

        {/* Trust badge */}
        <View className="mx-4 mb-4 flex-row items-center gap-2 rounded-xl bg-emerald-50 p-3">
          <ShieldCheck color="#10b981" size={18} />
          <Text className="text-sm text-emerald-700">Your account is secured</Text>
        </View>

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          className="mx-4 mb-8 flex-row items-center justify-center gap-2 rounded-xl border border-red-200 py-3"
        >
          <LogOut color="#ef4444" size={18} />
          <Text className="text-sm font-medium text-red-500">Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
