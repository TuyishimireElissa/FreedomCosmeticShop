/**
 * WishlistScreen — saved products.
 */

import React, { useEffect, useState } from "react"
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import { Image } from "expo-image"
import { useAuthStore } from "@/store/useStore"
import { api } from "@/services/api"
import { formatRWF } from "@/lib/format"
import { Heart, Star } from "lucide-react-native"

export function WishlistScreen() {
  const navigation = useNavigation<any>()
  const { wishlist, toggleWishlist } = useAuthStore()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      if (wishlist.length === 0) {
        setProducts([])
        setLoading(false)
        return
      }
      try {
        // Fetch wishlist products
        const promises = wishlist.map((id) => api.getProduct(id))
        const results = await Promise.all(promises)
        setProducts(results.map((r) => r.product))
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    })()
  }, [wishlist])

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate("ProductDetail", { slug: item.slug })}
      className="mx-4 mb-3 flex-row gap-3 rounded-xl border border-border bg-card p-3"
    >
      <Image source={{ uri: item.images[0] }} className="h-20 w-20 rounded-lg bg-muted" contentFit="cover" />
      <View className="flex-1">
        <Text className="text-sm font-medium text-foreground" numberOfLines={2}>{item.name}</Text>
        <View className="flex-row items-center gap-1 mt-1">
          <Star color="#f59e0b" size={12} fill="#f59e0b" />
          <Text className="text-xs text-muted-foreground">{item.rating.toFixed(1)}</Text>
        </View>
        <Text className="mt-1 text-base font-bold text-foreground">{formatRWF(item.price)}</Text>
      </View>
      <TouchableOpacity onPress={() => toggleWishlist(item.id)} className="p-2">
        <Heart color="#b76e79" size={20} fill="#b76e79" />
      </TouchableOpacity>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 py-3">
        <Text className="text-lg font-bold text-foreground">Wishlist ({wishlist.length})</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#b76e79" size="large" className="mt-8" />
      ) : products.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Heart color="#b76e79" size={48} />
          <Text className="mt-4 text-base text-muted-foreground">No saved products yet</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 16 }}
        />
      )}
    </SafeAreaView>
  )
}
