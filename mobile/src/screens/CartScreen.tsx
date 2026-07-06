/**
 * CartScreen — cart items with qty controls + checkout button.
 */

import React from "react"
import { View, Text, FlatList, TouchableOpacity, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import { Image } from "expo-image"
import { useAuthStore } from "@/store/useStore"
import { formatRWF, deliveryFeeFor, RWANDAN_PROVINCES } from "@/lib/format"
import { ChevronLeft, Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react-native"
import { useState } from "react"

export function CartScreen() {
  const navigation = useNavigation<any>()
  const { cart, updateQuantity, removeFromCart, cartSubtotal } = useAuthStore()
  const [province, setProvince] = useState("Kigali City")

  const subtotal = cartSubtotal()
  const deliveryFee = deliveryFeeFor(province)
  const total = subtotal + deliveryFee

  const renderItem = ({ item }: { item: any }) => (
    <View className="mx-4 mb-3 flex-row gap-3 rounded-xl border border-border bg-card p-3">
      <Image source={{ uri: item.image }} className="h-20 w-20 rounded-lg bg-muted" contentFit="cover" />
      <View className="flex-1">
        <Text className="text-sm font-medium text-foreground" numberOfLines={2}>{item.name}</Text>
        <Text className="text-xs text-muted-foreground">{formatRWF(item.price)} each</Text>
        <View className="flex-row items-center justify-between mt-2">
          <View className="flex-row items-center rounded-lg border border-border">
            <TouchableOpacity onPress={() => updateQuantity(item.productId, item.quantity - 1)} className="p-1.5">
              <Minus color="#6d3a45" size={14} />
            </TouchableOpacity>
            <Text className="w-8 text-center text-sm font-medium">{item.quantity}</Text>
            <TouchableOpacity onPress={() => updateQuantity(item.productId, item.quantity + 1)} className="p-1.5">
              <Plus color="#6d3a45" size={14} />
            </TouchableOpacity>
          </View>
          <Text className="text-sm font-bold">{formatRWF(item.price * item.quantity)}</Text>
          <TouchableOpacity onPress={() => removeFromCart(item.productId)} className="p-1">
            <Trash2 color="#ef4444" size={16} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )

  if (cart.length === 0) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ShoppingBag color="#b76e79" size={48} />
        <Text className="mt-4 text-lg font-bold text-foreground">Your cart is empty</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("HomeMain")}
          className="mt-4 rounded-xl bg-primary px-6 py-3"
        >
          <Text className="text-sm font-semibold text-white">Start shopping</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <ChevronLeft color="#6d3a45" size={24} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-foreground">Your cart ({cart.length})</Text>
      </View>

      <FlatList
        data={cart}
        renderItem={renderItem}
        keyExtractor={(item) => item.productId}
        contentContainerStyle={{ paddingBottom: 16 }}
      />

      {/* Summary */}
      <View className="border-t border-border bg-card p-4">
        <View className="flex-row justify-between py-1">
          <Text className="text-sm text-muted-foreground">Subtotal</Text>
          <Text className="text-sm font-medium">{formatRWF(subtotal)}</Text>
        </View>
        <View className="flex-row justify-between py-1">
          <Text className="text-sm text-muted-foreground">Delivery</Text>
          <Text className="text-sm font-medium">{formatRWF(deliveryFee)}</Text>
        </View>
        <View className="flex-row justify-between py-2 border-t border-border mt-1">
          <Text className="text-base font-bold">Total</Text>
          <Text className="text-xl font-bold">{formatRWF(total)}</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate("Checkout")}
          className="mt-3 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-4"
        >
          <Text className="text-base font-semibold text-white">Checkout</Text>
          <ArrowRight color="#fff" size={18} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
