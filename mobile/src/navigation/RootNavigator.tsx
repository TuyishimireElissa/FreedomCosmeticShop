/**
 * RootNavigator — switches between Auth flow and Main app.
 *
 * If user is authenticated → MainNavigator (bottom tabs)
 * If not authenticated → AuthNavigator (login/register)
 * First launch → OnboardingNavigator (3 slides)
 */

import React from "react"
import { useAuthStore } from "@/store/useStore"
import { AuthNavigator } from "./AuthNavigator"
import { MainNavigator } from "./MainNavigator"
import { OnboardingNavigator } from "./OnboardingNavigator"

export function RootNavigator() {
  const { isAuthenticated, hasSeenOnboarding } = useAuthStore()

  // First launch — show onboarding
  if (!hasSeenOnboarding) {
    return <OnboardingNavigator />
  }

  // Not authenticated — show auth flow
  if (!isAuthenticated) {
    return <AuthNavigator />
  }

  // Authenticated — show main app
  return <MainNavigator />
}
