/**
 * RegisterScreen — name, phone, password, optional email → OTP flow.
 */

import React, { useState } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import type { AuthStackParamList } from "@/navigation/AuthNavigator"
import { api } from "@/services/api"
import { Sparkles, User, Phone, Lock, Mail, Eye, EyeOff, ArrowRight } from "lucide-react-native"

type RegisterNav = NativeStackNavigationProp<AuthStackParamList, "Register">

export function RegisterScreen() {
  const navigation = useNavigation<RegisterNav>()
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRegister = async () => {
    if (!name || !phone || !password) {
      setError("Name, phone, and password are required")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setLoading(true)
    setError(null)

    try {
      await api.register({ name, phone, password, email: email || undefined })
      // Navigate to OTP screen
      navigation.navigate("Otp", { phone, name, password, flow: "register" })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-6">
          {/* Header */}
          <View className="mb-8 items-center">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-primary">
              <Sparkles color="#fff" size={28} />
            </View>
            <Text className="mt-3 text-2xl font-bold text-foreground">
              Create account
            </Text>
            <Text className="mt-1 text-sm text-muted-foreground">
              Join FreedomCosmeticShop
            </Text>
          </View>

          {error && (
            <View className="mb-4 rounded-lg bg-red-50 p-3">
              <Text className="text-sm text-red-600">{error}</Text>
            </View>
          )}

          {/* Name */}
          <View className="mb-3">
            <Text className="mb-1 text-sm font-medium text-foreground">Full name</Text>
            <View className="flex-row items-center rounded-xl border border-border bg-card px-3">
              <User color="#9ca3af" size={20} />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Aline Mugisha"
                className="flex-1 px-3 py-3 text-base text-foreground"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          {/* Phone */}
          <View className="mb-3">
            <Text className="mb-1 text-sm font-medium text-foreground">Phone number</Text>
            <View className="flex-row items-center rounded-xl border border-border bg-card px-3">
              <Phone color="#9ca3af" size={20} />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="0788123456"
                keyboardType="phone-pad"
                className="flex-1 px-3 py-3 text-base text-foreground"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          {/* Email (optional) */}
          <View className="mb-3">
            <Text className="mb-1 text-sm font-medium text-foreground">Email (optional)</Text>
            <View className="flex-row items-center rounded-xl border border-border bg-card px-3">
              <Mail color="#9ca3af" size={20} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                className="flex-1 px-3 py-3 text-base text-foreground"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          {/* Password */}
          <View className="mb-4">
            <Text className="mb-1 text-sm font-medium text-foreground">Password</Text>
            <View className="flex-row items-center rounded-xl border border-border bg-card px-3">
              <Lock color="#9ca3af" size={20} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                secureTextEntry={!showPassword}
                className="flex-1 px-3 py-3 text-base text-foreground"
                placeholderTextColor="#9ca3af"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeOff color="#9ca3af" size={20} />
                ) : (
                  <Eye color="#9ca3af" size={20} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Register button */}
          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading}
            className="h-14 flex-row items-center justify-center rounded-xl bg-primary"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text className="mr-2 text-base font-semibold text-white">Continue</Text>
                <ArrowRight color="#fff" size={20} />
              </>
            )}
          </TouchableOpacity>

          {/* Login link */}
          <View className="mt-6 flex-row justify-center">
            <Text className="text-sm text-muted-foreground">Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text className="text-sm font-semibold text-primary">Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
