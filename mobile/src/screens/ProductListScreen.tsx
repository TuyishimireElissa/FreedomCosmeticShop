/**
 * ProductListScreen — product grid with category filter.
 */

import React, { useEffect, useState, useCallback } from "react"
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation, useRoute } from "@react-navigation/native"
import type { RouteProp } from "@react-navigation/native"
import { Image } from "expo-image"
import { api } from "@/services/api"
import { formatRWF } from "@/lib/format"
import { useAuthStore } from "@/store/useStore"
import { Star, Plus, ChevronLeft, SlidersHorizontal } from "lucide-react-native"

interface Product {
  id: string
  name: string
  slug: string
  price: number
  compareAt: number | null
  images: string[]
  rating: number
  reviewsCount: number
  brand?: { name: string }
  stock: number
}

export function ProductListScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<RouteProp<any, any>>()
  const category = route.params?.category || null
  const { addToCart } = useAuthStore()

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const params = category ? `?category=${category}` : ""
      const res = await api.getProducts(params)
      setProducts(res.products as Product[])
    } catch {
      // ignore
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [category])

  useEffect(() => {
    load()
  }, [load])

  const handleAddToCart = (product: Product) => {
    addToCart({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: product.images[0],
      stock: product.stock,
    })
  }

  const renderItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate("ProductDetail", { slug: item.slug })}
      className="flex-1 m-1.5 rounded-xl border border-border bg-card overflow-hidden"
    >
      <View className="relative aspect-square bg-muted">
        <Image source={{ uri: item.images[0] }} className="h-full w-full" contentFit="cover" />
        {item.compareAt && item.compareAt > item.price && (
          <View className="absolute left-2 top-2 rounded-md bg-primary px-2 py-0.5">
            <Text className="text-xs font-bold text-white">
              -{Math.round(((item.compareAt - item.price) / item.compareAt) * 100)}%
            </Text>
          </View>
        )}
      </View>
      <View className="p-2">
        {item.brand && (
          <Text className="text-xs text-muted-foreground">{item.brand.name}</Text>
        )}
        <Text className="text-sm font-medium text-foreground" numberOfLines={2}>
          {item.name}
        </Text>
        <View className="flex-row items-center gap-1">
          <Star color="#f59e0b" size={10} fill="#f59e0b" />
          <Text className="text-xs text-muted-foreground">
            {item.rating.toFixed(1)} ({item.reviewsCount})
          </Text>
        </View>
        <View className="flex-row items-center justify-between mt-1">
          <View>
            <Text className="text-sm font-bold text-foreground">{formatRWF(item.price)}</Text>
            {item.compareAt && item.compareAt > item.price && (
              <Text className="text-xs text-muted-foreground line-through">
                {formatRWF(item.compareAt)}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => handleAddToCart(item)}
            className="h-8 w-8 items-center justify-center rounded-lg bg-primary"
          >
            <Plus color="#fff" size={16} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <ChevronLeft color="#6d3a45" size={24} />
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-bold text-foreground">
          {category ? category.charAt(0).toUpperCase() + category.slice(1) : "All products"}
        </Text>
        <TouchableOpacity>
          <SlidersHorizontal color="#6d3a45" size={20} />
        </TouchableOpacity>
      </View>

      {/* Product grid */}
      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ padding: 6 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#b76e79" />}
        ListEmptyComponent={
          !loading ? (
            <View className="items-center py-20">
              <Text className="text-sm text-muted-foreground">No products found</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  )
}
