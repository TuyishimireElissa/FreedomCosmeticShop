/**
 * CheckoutScreen — delivery info + MTN MoMo payment.
 */

import React, { useState } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import { useAuthStore } from "@/store/useStore"
import { api } from "@/services/api"
import { formatRWF, deliveryFeeFor, RWANDAN_PROVINCES, PAYMENT_METHODS } from "@/lib/format"
import { ChevronLeft, Phone, MapPin, CreditCard, Check } from "lucide-react-native"

export function CheckoutScreen() {
  const navigation = useNavigation<any>()
  const { cart, cartSubtotal, user, clearCart } = useAuthStore()

  const [name, setName] = useState(user?.name || "")
  const [phone, setPhone] = useState(user?.phone || "")
  const [address, setAddress] = useState("")
  const [district, setDistrict] = useState("Nyarugenge")
  const [province, setProvince] = useState("Kigali City")
  const [momoPhone, setMomoPhone] = useState(phone)
  const [paymentMethod, setPaymentMethod] = useState("MTN_MOMO")
  const [placing, setPlacing] = useState(false)
  const [paying, setPaying] = useState(false)

  const subtotal = cartSubtotal()
  const deliveryFee = deliveryFeeFor(province)
  const total = subtotal + deliveryFee

  const handlePlaceOrder = async () => {
    if (!name || !phone || !address) {
      Alert.alert("Missing info", "Please fill in all required fields")
      return
    }

    setPlacing(true)
    try {
      // Step 1: Create order
      const orderData = await api.createOrder({
        customerName: name,
        customerPhone: phone,
        address,
        city: district,
        province,
        district,
        paymentMethod,
        items: cart.map((i: any) => ({ productId: i.productId, quantity: i.quantity })),
      })

      const orderId = (orderData as any).order.id

      // Step 2: For MoMo, initiate payment
      if (paymentMethod === "MTN_MOMO" || paymentMethod === "AIRTEL_MONEY") {
        setPaying(true)
        const payData = await api.initiateMomo({
          orderId,
          phone: momoPhone,
          network: paymentMethod === "MTN_MOMO" ? "MTN" : "AIRTEL",
        })

        // Poll payment status
        const paymentId = (payData as any).transactionId
        let paid = false
        for (let i = 0; i < 60; i++) {
          await new Promise((r) => setTimeout(r, 3000))
          const statusData = await api.getPaymentStatus(paymentId)
          if ((statusData as any).status === "PAID") {
            paid = true
            break
          }
          if ((statusData as any).status === "FAILED") break
        }

        if (!paid) {
          Alert.alert("Payment failed", "Please try again")
          setPaying(false)
          return
        }
      }

      clearCart()
      navigation.replace("OrderTracking", { orderNumber: (orderData as any).order.orderNumber })
    } catch (e) {
      Alert.alert("Order failed", e instanceof Error ? e.message : "Unknown error")
    } finally {
      setPlacing(false)
      setPaying(false)
    }
  }

  if (paying) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#b76e79" size="large" />
        <Text className="mt-4 text-base font-medium text-foreground">
          Waiting for payment approval...
        </Text>
        <Text className="mt-1 text-sm text-muted-foreground">
          Check your phone and approve the MTN MoMo prompt
        </Text>
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
        <Text className="text-lg font-bold text-foreground">Checkout</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Delivery info */}
        <View className="px-4 pb-4">
          <Text className="mb-3 text-base font-semibold text-foreground">Delivery information</Text>

          <View className="mb-3">
            <Text className="mb-1 text-sm text-muted-foreground">Full name *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              className="rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground"
              placeholder="Aline Mugisha"
            />
          </View>

          <View className="mb-3">
            <Text className="mb-1 text-sm text-muted-foreground">Phone number *</Text>
            <View className="flex-row items-center rounded-xl border border-border bg-card px-4">
              <Phone color="#9ca3af" size={18} />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="0788123456"
                keyboardType="phone-pad"
                className="flex-1 px-3 py-3 text-base text-foreground"
              />
            </View>
          </View>

          <View className="mb-3">
            <Text className="mb-1 text-sm text-muted-foreground">Address *</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              className="rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground"
              placeholder="KN 4 Ave, Kigali Heights"
              multiline
            />
          </View>

          <View className="mb-3">
            <Text className="mb-1 text-sm text-muted-foreground">Province</Text>
            <View className="flex-row flex-wrap">
              {RWANDAN_PROVINCES.map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setProvince(p)}
                  className={`mr-2 mb-2 rounded-lg border px-3 py-2 ${
                    province === p ? "border-primary bg-primary/10" : "border-border"
                  }`}
                >
                  <Text className={`text-sm ${province === p ? "text-primary font-medium" : "text-muted-foreground"}`}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Payment method */}
        <View className="px-4 pb-4">
          <Text className="mb-3 text-base font-semibold text-foreground">Payment method</Text>

          {(Object.keys(PAYMENT_METHODS) as Array<keyof typeof PAYMENT_METHODS>).map((key) => {
            const method = PAYMENT_METHODS[key]
            const selected = paymentMethod === key
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setPaymentMethod(key)}
                className={`mb-2 flex-row items-center justify-between rounded-xl border-2 p-4 ${
                  selected ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <View className="flex-row items-center gap-3">
                  <Text className="text-2xl">{method.icon}</Text>
                  <View>
                    <Text className="text-sm font-medium text-foreground">{method.label}</Text>
                    {key === "MTN_MOMO" && (
                      <Text className="text-xs text-primary">Most popular</Text>
                    )}
                  </View>
                </View>
                {selected && <Check color="#b76e79" size={20} />}
              </TouchableOpacity>
            )
          })}

          {/* MoMo phone */}
          {(paymentMethod === "MTN_MOMO" || paymentMethod === "AIRTEL_MONEY") && (
            <View className="mt-2">
              <Text className="mb-1 text-sm text-muted-foreground">
                {paymentMethod === "MTN_MOMO" ? "MTN" : "Airtel"} phone number
              </Text>
              <TextInput
                value={momoPhone}
                onChangeText={setMomoPhone}
                placeholder="0788123456"
                keyboardType="phone-pad"
                className="rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground"
              />
            </View>
          )}
        </View>

        {/* Order summary */}
        <View className="mx-4 mb-4 rounded-xl border border-border bg-card p-4">
          <Text className="mb-2 text-sm font-semibold">Order summary</Text>
          <View className="flex-row justify-between py-1">
            <Text className="text-sm text-muted-foreground">Subtotal ({cart.length} items)</Text>
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
        </View>
      </ScrollView>

      {/* Place order */}
      <View className="border-t border-border bg-card p-4">
        <TouchableOpacity
          onPress={handlePlaceOrder}
          disabled={placing}
          className="flex-row items-center justify-center gap-2 rounded-xl bg-primary py-4"
        >
          {placing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-semibold text-white">
              Place order · {formatRWF(total)}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
