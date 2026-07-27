"use client"

/**
 * useTheme — simple, dependency-free theme management.
 *
 * Replaces next-themes to avoid SSR/hydration issues in standalone builds.
 * Manages theme via document.documentElement.classList + localStorage.
 *
 * Features:
 *   - Toggles "dark" class on <html>
 *   - Persists choice to localStorage
 *   - Respects system preference on first visit
 *   - Hydration-safe (returns "light" during SSR, actual theme after mount)
 */

import { useState, useEffect, useCallback } from "react"

type Theme = "light" | "dark"

const STORAGE_KEY = "freedom-theme"

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "light" || stored === "dark") return stored
  } catch {
    // localStorage not available
  }
  return null
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  if (theme === "dark") {
    root.classList.add("dark")
  } else {
    root.classList.remove("dark")
  }
  root.style.colorScheme = theme
}

export function useTheme() {
  // Always start with "light" on SSR to avoid hydration mismatch.
  // The actual theme is applied after mount in useEffect.
  const [theme, setThemeState] = useState<Theme>("light")
  const [mounted, setMounted] = useState(false)

  // On mount: read stored/system theme and apply it
  useEffect(() => {
    const stored = getStoredTheme()
    const initial = stored ?? getSystemTheme()
    setThemeState(initial)
    applyTheme(initial)
    setMounted(true)
  }, [])

  // Listen for system theme changes (only if user hasn't explicitly chosen)
  useEffect(() => {
    if (!mounted) return
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = (e: MediaQueryListEvent) => {
      // Only follow system if no explicit choice stored
      if (!getStoredTheme()) {
        const newTheme = e.matches ? "dark" : "light"
        setThemeState(newTheme)
        applyTheme(newTheme)
      }
    }
    media.addEventListener("change", handler)
    return () => media.removeEventListener("change", handler)
  }, [mounted])

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    applyTheme(newTheme)
    try {
      localStorage.setItem(STORAGE_KEY, newTheme)
    } catch {
      // localStorage not available
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark")
  }, [theme, setTheme])

  return {
    theme,
    setTheme,
    toggleTheme,
    mounted,
    // Compatibility with next-themes API
    resolvedTheme: theme,
  }
}
