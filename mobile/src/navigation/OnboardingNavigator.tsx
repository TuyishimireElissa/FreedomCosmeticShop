/**
 * OnboardingNavigator — 3-slide intro for first-time users.
 */

import React from "react"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { OnboardingScreen } from "@/screens/OnboardingScreen"

const Stack = createNativeStackNavigator()

export function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    </Stack.Navigator>
  )
}
