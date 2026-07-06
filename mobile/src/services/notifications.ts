/**
 * Push Notifications Service — Expo Notifications.
 *
 * Features:
 *   - Register for push notifications
 *   - Handle incoming notifications (new orders, delivery updates)
 *   - Schedule local notifications (abandoned cart reminders)
 *   - Deep linking from notification taps
 *
 * Setup:
 *   1. Install eas-cli: npm install -g eas-cli
 *   2. Configure Firebase (Android) + APNs (iOS) via EAS
 *   3. Run: eas build:configure
 *
 * The push token is sent to the backend to associate with the user.
 */

import * as Notifications from "expo-notifications"
import { Platform } from "react-native"
import { api } from "./api"

// ─── Notification handler (foreground) ───────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

/**
 * Setup push notifications:
 *   1. Request permissions
 *   2. Get Expo push token
 *   3. Register token with backend
 *   4. Setup notification tap handler (deep linking)
 */
export async function setupNotifications(): Promise<void> {
  try {
    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== "granted") {
      console.log("[Notifications] Permission not granted")
      return
    }

    // Get push token
    const token = (await Notifications.getExpoPushTokenAsync()).data
    console.log("[Notifications] Push token:", token)

    // Register token with backend
    // await api.registerPushToken(token)

    // Setup notification tap handler (deep linking)
    Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data
      console.log("[Notifications] Tapped:", data)

      // Navigate based on notification type
      if (data.type === "ORDER_UPDATE" && data.orderNumber) {
        // Navigate to order tracking
        // navigationRef.navigate('OrderTracking', { orderNumber: data.orderNumber })
      }
    })

    // Handle notifications received while app is in foreground
    Notifications.addNotificationReceivedListener((notification) => {
      console.log("[Notifications] Received in foreground:", notification.request.content)
    })

    // Set notification channel for Android
    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("orders", {
        name: "Orders",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#b76e79",
      })

      Notifications.setNotificationChannelAsync("promotions", {
        name: "Promotions",
        importance: Notifications.AndroidImportance.DEFAULT,
      })
    }
  } catch (e) {
    console.error("[Notifications] Setup error:", e)
  }
}

/**
 * Schedule a local notification (e.g., abandoned cart reminder).
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  trigger: Notifications.NotificationTriggerInput,
  data?: Record<string, unknown>
): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: true,
    },
    trigger,
  })
  return id
}

/**
 * Cancel a scheduled notification.
 */
export async function cancelScheduledNotification(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id)
}

/**
 * Cancel all scheduled notifications.
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync()
}

/**
 * Set badge count (iOS).
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count)
}
