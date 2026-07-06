/**
 * ProductDetailScreen — image zoom, info, add to cart, share.
 */

import React, { useEffect, useState } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation, useRoute } from "@react-navigation/native"
import type { RouteProp } from "@react-navigation/native-stack"
import { Image } from "expo-image"
import { api } from "@/services/api"
import { formatRWF } from "@/lib/format"
import { useAuthStore } from "@/store/useStore"
import { storage } from "@/services/storage"
import {
  ChevronLeft,
  Heart,
  Share2,
  ShoppingBag,
  Star,
  Minus,
  Plus,
  Truck,
  ShieldCheck,
  MessageCircle,
} from "lucide-react-native"

export function ProductDetailScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<RouteProp<any, any>>()
  const slug = route.params?.slug

  const { addToCart, toggleWishlist, isInWishlist } = useAuthStore()
  const [product, setProduct] = useState<any>(null)
  const [related, setRelated] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)
  const [activeImage, setActiveImage] = useState(0)

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getProduct(slug)
        setProduct(data.product)
        setRelated(data.related || [])
        await storage.addRecentlyViewed(slug)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [slug])

  const handleAddToCart = () => {
    if (!product) return
    addToCart(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        image: product.images[0],
        stock: product.stock,
      },
      qty
    )
  }

  const handleShare = async () => {
    if (!product) return
    await Share.share({
      message: `Check out ${product.name} on Ubumwe Beauty! ${formatRWF(product.price)}`,
      url: `https://ubumwe.beauty/products/${product.slug}`,
      title: product.name,
    })
  }

  const handleWhatsAppShare = () => {
    if (!product) return
    const msg = `Check out ${product.name} on Ubumwe Beauty! ${formatRWF(product.price)}`
    // Open WhatsApp with the message
    // In React Native, use Linking.openURL
    import("react-native").then(({ Linking }) => {
      Linking.openURL(`https://wa.me/?text=${encodeURIComponent(msg)}`)
    })
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#b76e79" size="large" />
      </SafeAreaView>
    )
  }

  if (!product) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <Text className="text-base text-muted-foreground">Product not found</Text>
      </SafeAreaView>
    )
  }

  const hasDiscount = product.compareAt && product.compareAt > product.price
  const wishlisted = isInWishlist(product.id)

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft color="#6d3a45" size={24} />
        </TouchableOpacity>
        <View className="flex-row gap-3">
          <TouchableOpacity onPress={() => toggleWishlist(product.id)}>
            <Heart color={wishlisted ? "#b76e79" : "#6d3a45" size={22} fill={wishlisted ? "#b76e79" : "transparent"} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare}>
            <Share2 color="#6d3a45" size={22} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image */}
        <View className="mx-4 mb-4 aspect-square overflow-hidden rounded-2xl bg-muted">
          <Image
            source={{ uri: product.images[activeImage] }}
            className="h-full w-full"
            contentFit="cover"
          />
          {hasDiscount && (
            <View className="absolute left-3 top-3 rounded-md bg-primary px-2.5 py-1">
              <Text className="text-xs font-bold text-white">
                -{Math.round(((product.compareAt - product.price) / product.compareAt) * 100)}%
              </Text>
            </View>
          )}
        </View>

        {/* Thumbnails */}
        {product.images.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 px-4">
            {product.images.map((img: string, i: number) => (
              <TouchableOpacity
                key={i}
                onPress={() => setActiveImage(i)}
                className={`mr-2 h-16 w-16 overflow-hidden rounded-lg border-2 ${
                  activeImage === i ? "border-primary" : "border-transparent"
                }`}
              >
                <Image source={{ uri: img }} className="h-full w-full" contentFit="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Info */}
        <View className="px-4">
          {product.brand?.name && (
            <Text className="text-xs font-semibold uppercase text-primary">
              {product.brand.name}
            </Text>
          )}
          <Text className="mt-1 text-xl font-bold text-foreground">{product.name}</Text>

          {/* Rating */}
          <View className="mt-1 flex-row items-center gap-1">
            <Star color="#f59e0b" size={14} fill="#f59e0b" />
            <Text className="text-sm font-medium text-foreground">{product.rating.toFixed(1)}</Text>
            <Text className="text-sm text-muted-foreground">({product.reviewsCount} reviews)</Text>
          </View>

          {/* Price */}
          <View className="mt-3 flex-row items-baseline gap-2">
            <Text className="text-2xl font-bold text-foreground">{formatRWF(product.price)}</Text>
            {hasDiscount && (
              <Text className="text-base text-muted-foreground line-through">
                {formatRWF(product.compareAt)}
              </Text>
            )}
          </View>

          {/* Stock */}
          <Text className="mt-2 text-sm text-emerald-600">
            {product.stock > 0 ? "✓ In stock" : "Out of stock"}
          </Text>

          {/* Description */}
          <Text className="mt-4 text-sm leading-5 text-muted-foreground">
            {product.description}
          </Text>

          {/* Trust badges */}
          <View className="mt-4 flex-row gap-4">
            <View className="items-center">
              <Truck color="#b76e79" size={20} />
              <Text className="mt-1 text-xs text-muted-foreground">Fast delivery</Text>
            </View>
            <View className="items-center">
              <ShieldCheck color="#b76e79" size={20} />
              <Text className="mt-1 text-xs text-muted-foreground">100% authentic</Text>
            </View>
          </View>

          {/* WhatsApp share */}
          <TouchableOpacity
            onPress={handleWhatsAppShare}
            className="mt-4 flex-row items-center justify-center gap-2 rounded-xl border border-emerald-500 py-3"
          >
            <MessageCircle color="#10b981" size={18} />
            <Text className="text-sm font-medium text-emerald-600">Share on WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom bar: qty + add to cart */}
      <View className="flex-row items-center gap-3 border-t border-border bg-card px-4 py-3">
        <View className="flex-row items-center rounded-lg border border-border">
          <TouchableOpacity
            onPress={() => setQty((q) => Math.max(1, q - 1))}
            className="p-2"
          >
            <Minus color="#6d3a45" size={16} />
          </TouchableOpacity>
          <Text className="w-10 text-center text-base font-medium">{qty}</Text>
          <TouchableOpacity
            onPress={() => setQty((q) => q + 1)}
            className="p-2"
          >
            <Plus color="#6d3a45" size={16} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={handleAddToCart}
          disabled={product.stock === 0}
          className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3"
        >
          <ShoppingBag color="#fff" size={18} />
          <Text className="text-base font-semibold text-white">
            {product.stock === 0 ? "Sold out" : "Add to cart"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
