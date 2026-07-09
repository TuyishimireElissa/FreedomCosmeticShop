/**
 * useBiometric — fingerprint/Face ID login hook.
 *
 * Uses expo-local-authentication.
 * Requires: expo-local-authentication plugin in app.json
 */

import { useState, useCallback } from "react"
import * as LocalAuthentication from "expo-local-authentication"
import * as SecureStore from "expo-secure-store"

export function useBiometric() {
  const [supported, setSupported] = useState(false)
  const [enrolled, setEnrolled] = useState(false)

  // Check if biometric is available + enrolled
  const checkAvailability = useCallback(async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync()
    const enrolledStatus = await LocalAuthentication.isEnrolledAsync()
    setSupported(compatible)
    setEnrolled(enrolledStatus)
    return { compatible, enrolled: enrolledStatus }
  }, [])

  // Authenticate with biometric
  const authenticate = useCallback(async (): Promise<boolean> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to login to FreedomCosmeticShop",
        fallbackLabel: "Use password",
        cancelLabel: "Cancel",
        disableDeviceFallback: false,
      })

      if (result.success) {
        // Load saved credentials from SecureStore
        const savedPhone = await SecureStore.getItemAsync("ub_saved_phone")
        const savedPassword = await SecureStore.getItemAsync("ub_saved_password")

        if (savedPhone && savedPassword) {
          return true
        }
      }
      return false
    } catch (e) {
      console.error("Biometric auth error:", e)
      return false
    }
  }, [])

  // Save credentials for biometric login
  const saveCredentials = useCallback(async (phone: string, password: string) => {
    await SecureStore.setItemAsync("ub_saved_phone", phone)
    await SecureStore.setItemAsync("ub_saved_password", password)
  }, [])

  // Clear saved credentials
  const clearCredentials = useCallback(async () => {
    await SecureStore.deleteItemAsync("ub_saved_phone")
    await SecureStore.deleteItemAsync("ub_saved_password")
  }, [])

  return {
    supported,
    enrolled,
    checkAvailability,
    authenticate,
    saveCredentials,
    clearCredentials,
  }
}
