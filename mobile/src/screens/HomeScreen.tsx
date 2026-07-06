/**
 * HomeScreen — mobile-optimized home with hero, categories, products.
 */

import React, { useEffect, useState, useCallback } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { Image } from "expo-image"
import { api } from "@/services/api"
import { storage } from "@/services/storage"
import { formatRWF } from "@/lib/format"
import { useAuthStore } from "@/store/useStore"
import { Sparkles, Search, Bell, ShoppingBag, Star, ArrowRight } from "lucide-react-native"

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
}

interface Category {
  id: string
  name: string
  slug: string
  image: string | null
}

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>()
  const { cart } = useAuthStore()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        api.getProducts("?featured=true&limit=8"),
        api.getCategories(),
      ])
      setProducts(prodRes.products as Product[])
      setCategories(catRes.categories as Category[])
      // Cache for offline
      await storage.setCachedProducts(prodRes.products)
    } catch (e) {
      // Try offline cache
      const cached = await storage.getCachedProducts()
      if (cached) setProducts(cached as Product[])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const onRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate("ProductDetail", { slug: item.slug })}
      className="mr-3 w-40"
    >
      <View className="relative aspect-square overflow-hidden rounded-xl bg-muted">
        <Image
          source={{ uri: item.images[0] }}
          className="h-full w-full"
          contentFit="cover"
        />
        {item.compareAt && item.compareAt > item.price && (
          <View className="absolute left-2 top-2 rounded-md bg-primary px-2 py-0.5">
            <Text className="text-xs font-bold text-white">
              -{Math.round(((item.compareAt - item.price) / item.compareAt) * 100)}%
            </Text>
          </View>
        )}
      </View>
      {item.brand && (
        <Text className="mt-1 text-xs text-muted-foreground">{item.brand.name}</Text>
      )}
      <Text className="text-sm font-medium text-foreground" numberOfLines={2}>
        {item.name}
      </Text>
      <View className="mt-0.5 flex-row items-center gap-1">
        <Star color="#f59e0b" size={12} fill="#f59e0b" />
        <Text className="text-xs text-muted-foreground">
          {item.rating.toFixed(1)} ({item.reviewsCount})
        </Text>
      </View>
      <Text className="mt-0.5 text-sm font-bold text-foreground">
        {formatRWF(item.price)}
      </Text>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#b76e79" />}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3">
          <View className="flex-row items-center gap-2">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-primary">
              <Sparkles color="#fff" size={16} />
            </View>
            <Text className="text-lg font-bold text-foreground">
              Ubumwe <Text className="text-primary">Beauty</Text>
            </Text>
          </View>
          <View className="flex-row gap-3">
            <TouchableOpacity onPress={() => navigation.navigate("Notifications")}>
              <Bell color="#6d3a45" size={22} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate("CartMain")}>
              <View>
                <ShoppingBag color="#6d3a45" size={22} />
                {cart.length > 0 && (
                  <View className="absolute -right-2 -top-2 h-5 w-5 items-center justify-center rounded-full bg-primary">
                    <Text className="text-xs font-bold text-white">{cart.length}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search bar */}
        <TouchableOpacity
          onPress={() => navigation.navigate("ProductList")}
          className="mx-4 mb-4 flex-row items-center rounded-full border border-border bg-card px-4 py-2.5"
        >
          <Search color="#9ca3af" size={18} />
          <Text className="ml-2 text-sm text-muted-foreground">Search products...</Text>
        </TouchableOpacity>

        {/* Hero banner */}
        <View className="mx-4 mb-4 overflow-hidden rounded-2xl bg-primary">
          <Image
            source={{ uri: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&auto=format&fit=crop" }}
            className="h-40 w-full"
            contentFit="cover"
          />
          <View className="absolute inset-0 bg-black/30" />
          <View className="absolute bottom-0 left-0 p-4">
            <Text className="text-xl font-bold text-white">Beauty that unites us</Text>
            <Text className="mt-1 text-sm text-white/80">
              Authentic cosmetics for Rwanda
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("ProductList")}
              className="mt-3 flex-row items-center gap-1 rounded-full bg-white px-4 py-1.5"
            >
              <Text className="text-sm font-semibold text-primary">Shop now</Text>
              <ArrowRight color="#b76e79" size={14} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Categories */}
        <View className="mb-4 px-4">
          <Text className="mb-3 text-lg font-bold text-foreground">Shop by category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => navigation.navigate("ProductList", { category: cat.slug })}
                className="mr-3 w-28"
              >
                <View className="h-28 overflow-hidden rounded-xl bg-muted">
                  {cat.image && (
                    <Image source={{ uri: cat.image }} className="h-full w-full" contentFit="cover" />
                  )}
                </View>
                <Text className="mt-1 text-center text-sm font-medium text-foreground">
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Featured products */}
        <View className="mb-4 px-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-foreground">Featured products</Text>
            <TouchableOpacity onPress={() => navigation.navigate("ProductList")}>
              <Text className="text-sm font-medium text-primary">View all</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <Text className="text-sm text-muted-foreground">Loading...</Text>
          ) : (
            <FlatList
              data={products}
              renderItem={renderProduct}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
