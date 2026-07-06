/**
 * AuthNavigator — Login → Register → OTP flow.
 */

import React from "react"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { LoginScreen } from "@/screens/LoginScreen"
import { RegisterScreen } from "@/screens/RegisterScreen"
import { OtpScreen } from "@/screens/OtpScreen"

const Stack = createNativeStackNavigator()

export type AuthStackParamList = {
  Login: undefined
  Register: undefined
  Otp: { phone: string; name?: string; password?: string; flow: "register" | "login" | "reset" }
}

export function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#fff8f3" },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Otp" component={OtpScreen} />
    </Stack.Navigator>
  )
}
