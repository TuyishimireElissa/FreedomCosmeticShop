/**
 * OnboardingScreen — 3-slide intro for first-time users.
 *
 * Slides:
 *   1. Authentic cosmetics for Rwanda
 *   2. Pay with MTN MoMo or Cash on Delivery
 *   3. Fast delivery across all provinces
 */

import React, { useState, useRef } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Sparkles, Truck, Smartphone, Check } from "lucide-react-native"
import { useAuthStore } from "@/store/useStore"

const { width } = Dimensions.get("window")

const SLIDES = [
  {
    icon: Sparkles,
    title: "Authentic cosmetics\nfor Rwanda",
    description: "Skincare, makeup & haircare hand-picked for melanin-rich skin and textured hair.",
    color: "#b76e79",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&auto=format&fit=crop",
  },
  {
    icon: Smartphone,
    title: "Pay your way",
    description: "MTN MoMo, Airtel Money, or Cash on Delivery. No credit card required.",
    color: "#e96d8c",
    image: "https://images.unsplash.com/photo-1607602132700-068258431c6c?w=400&auto=format&fit=crop",
  },
  {
    icon: Truck,
    title: "Fast delivery\nnationwide",
    description: "1-2 days in Kigali, 3-5 days across all provinces. Track your order in real-time.",
    color: "#9a4f5c",
    image: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=400&auto=format&fit=crop",
  },
]

export function OnboardingScreen() {
  const { completeOnboarding } = useAuthStore()
  const [activeSlide, setActiveSlide] = useState(0)
  const scrollRef = useRef<ScrollView>(null)

  const handleScroll = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const slide = Math.round(e.nativeEvent.contentOffset.x / width)
    setActiveSlide(slide)
  }

  const handleNext = () => {
    if (activeSlide < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (activeSlide + 1) * width, animated: true })
    } else {
      completeOnboarding()
    }
  }

  const handleSkip = () => {
    completeOnboarding()
  }

  const slide = SLIDES[activeSlide]
  const Icon = slide.icon

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1">
        {/* Skip button */}
        <View className="flex-row justify-end p-4">
          <TouchableOpacity onPress={handleSkip}>
            <Text className="text-sm text-muted-foreground">Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Slides */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          className="flex-1"
        >
          {SLIDES.map((s, i) => {
            const SlideIcon = s.icon
            return (
              <View key={i} style={{ width }} className="items-center justify-center px-8">
                <View
                  className="mb-8 h-48 w-48 items-center justify-center rounded-full"
                  style={{ backgroundColor: s.color + "20" }}
                >
                  <SlideIcon color={s.color} size={64} />
                </View>
                <Text className="text-center text-2xl font-bold text-foreground">
                  {s.title}
                </Text>
                <Text className="mt-4 text-center text-base text-muted-foreground">
                  {s.description}
                </Text>
              </View>
            )
          })}
        </ScrollView>

        {/* Dots */}
        <View className="flex-row justify-center gap-2 pb-8">
          {SLIDES.map((_, i) => (
            <View
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === activeSlide ? "w-8 bg-primary" : "w-2 bg-muted"
              }`}
            />
          ))}
        </View>

        {/* CTA */}
        <View className="px-8 pb-8">
          <TouchableOpacity
            onPress={handleNext}
            className="h-14 items-center justify-center rounded-xl bg-primary"
          >
            <Text className="text-base font-semibold text-white">
              {activeSlide === SLIDES.length - 1 ? "Get Started" : "Next"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}
