/**
 * SplashScreen — brand logo with fade-in animation.
 * (Expo's native splash handles the initial display; this is the fallback.)
 */

import React, { useEffect } from "react"
import { View, Text, ActivityIndicator } from "react-native"
import { Sparkles } from "lucide-react-native"

export function SplashScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-primary">
      <Sparkles color="#fff" size={48} />
      <Text className="mt-4 text-2xl font-bold text-white">
        FreedomCosmeticShop
      </Text>
      <Text className="mt-1 text-sm text-white/80">
        Beauty that unites us
      </Text>
      <ActivityIndicator color="#fff" size="large" className="mt-8" />
    </View>
  )
}
