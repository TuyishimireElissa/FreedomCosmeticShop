"use client"

/**
 * ThemeProvider — wraps next-themes with project defaults.
 *
 * - attribute="class" — toggles the `dark` class on <html>
 * - defaultTheme="light" — FreedomCosmeticShop brand defaults to light (cream)
 * - enableSystem — respects OS preference if user hasn't explicitly chosen
 * - disableTransitionOnChange — avoids color flash on theme switch
 */

import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ComponentProps } from "react"

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
