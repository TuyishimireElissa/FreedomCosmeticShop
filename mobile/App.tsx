/**
 * Ubumwe Beauty — React Native Mobile App (Expo)
 *
 * Entry point. Sets up:
 *   - Splash screen
 *   - Font loading
 *   - Push notification setup
 *   - Root navigation (auth flow vs main app)
 *   - Deep linking
 *
 * Run: `npx expo start`
 */

import React, { useEffect, useState } from "react"
import { StatusBar } from "expo-status-bar"
import { SafeAreaProvider } from "react-native-safe-area-context"
import * as SplashScreen from "expo-splash-screen"
import * as Font from "expo-font"
import { NavigationContainer } from "@react-navigation/native"
import { RootNavigator } from "./src/navigation/RootNavigator"
import { useAuthStore } from "./src/store/useStore"
import { setupNotifications } from "./src/services/notifications"

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync()

export default function App() {
  const [appReady, setAppReady] = useState(false)
  const { restoreSession } = useAuthStore()

  useEffect(() => {
    async function prepare() {
      try {
        // Load fonts
        await Font.loadAsync({
          // Add custom fonts here if needed
        })

        // Restore auth session (from SecureStore)
        await restoreSession()

        // Setup push notifications
        await setupNotifications()

        // Simulate minimum splash time for branding
        await new Promise((r) => setTimeout(r, 1500))
      } catch (e) {
        console.warn("App preparation error:", e)
      } finally {
        setAppReady(true)
        await SplashScreen.hideAsync()
      }
    }
    prepare()
  }, [restoreSession])

  if (!appReady) {
    return null // Splash screen is still visible
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  )
}
