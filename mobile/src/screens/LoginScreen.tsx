/**
 * LoginScreen — phone + password login with biometric option.
 */

import React, { useState, useEffect } from "react"
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
import { useAuthStore } from "@/store/useStore"
import { useBiometric } from "@/hooks/useBiometric"
import { api } from "@/services/api"
import { Sparkles, Phone, Lock, Eye, EyeOff, Fingerprint, ArrowRight } from "lucide-react-native"

type LoginNav = NativeStackNavigationProp<AuthStackParamList, "Login">

export function LoginScreen() {
  const navigation = useNavigation<LoginNav>()
  const { login } = useAuthStore()
  const { supported, enrolled, checkAvailability, authenticate, saveCredentials } = useBiometric()

  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkAvailability()
  }, [checkAvailability])

  const handleLogin = async () => {
    if (!phone || !password) {
      setError("Please enter phone and password")
      return
    }

    setLoading(true)
    setError(null)

    try {
      await login(phone, password)
      await saveCredentials(phone, password)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  const handleBiometric = async () => {
    const success = await authenticate()
    if (success) {
      // Login with saved credentials
      const phone = await import("expo-secure-store").then((s) =>
        s.default.getItemAsync("ub_saved_phone")
      )
      const password = await import("expo-secure-store").then((s) =>
        s.default.getItemAsync("ub_saved_password")
      )
      if (phone && password) {
        setLoading(true)
        try {
          await login(phone, password)
        } catch (e) {
          setError(e instanceof Error ? e.message : "Biometric login failed")
        } finally {
          setLoading(false)
        }
      }
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-6">
          {/* Logo */}
          <View className="mb-8 items-center">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-primary">
              <Sparkles color="#fff" size={28} />
            </View>
            <Text className="mt-3 text-2xl font-bold text-foreground">
              Ubumwe <Text className="text-primary">Beauty</Text>
            </Text>
            <Text className="mt-1 text-sm text-muted-foreground">Welcome back</Text>
          </View>

          {/* Error */}
          {error && (
            <View className="mb-4 rounded-lg bg-red-50 p-3">
              <Text className="text-sm text-red-600">{error}</Text>
            </View>
          )}

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

          {/* Password */}
          <View className="mb-4">
            <Text className="mb-1 text-sm font-medium text-foreground">Password</Text>
            <View className="flex-row items-center rounded-xl border border-border bg-card px-3">
              <Lock color="#9ca3af" size={20} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
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

          {/* Login button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            className="h-14 flex-row items-center justify-center rounded-xl bg-primary"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text className="mr-2 text-base font-semibold text-white">Login</Text>
                <ArrowRight color="#fff" size={20} />
              </>
            )}
          </TouchableOpacity>

          {/* Biometric login */}
          {supported && enrolled && (
            <TouchableOpacity
              onPress={handleBiometric}
              className="mt-3 h-12 flex-row items-center justify-center rounded-xl border border-border"
            >
              <Fingerprint color="#b76e79" size={20} />
              <Text className="ml-2 text-sm font-medium text-primary">
                Login with fingerprint
              </Text>
            </TouchableOpacity>
          )}

          {/* Register link */}
          <View className="mt-6 flex-row justify-center">
            <Text className="text-sm text-muted-foreground">Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
              <Text className="text-sm font-semibold text-primary">Register</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
