"use client"

/**
 * usePaymentPolling — React hook for polling payment status.
 *
 * Features:
 *   - Polls /api/payments/status/[txId] every 5 seconds
 *   - Times out after 5 minutes (60 polls)
 *   - Returns status: "idle" | "polling" | "paid" | "failed" | "timeout"
 *   - Auto-stops when status is "paid" or "failed"
 *   - Returns elapsed time + remaining time for UI feedback
 *
 * Usage:
 *   const { status, elapsed, remaining, start, stop } = usePaymentPolling()
 *
 *   // Start polling after initiating payment
 *   start(paymentId)
 *
 *   // React to status changes
 *   useEffect(() => {
 *     if (status === "paid") {
 *       // Redirect to confirmation
 *     }
 *   }, [status])
 */

import { useState, useEffect, useCallback, useRef } from "react"

type PaymentStatus = "idle" | "polling" | "paid" | "failed" | "timeout"

const POLL_INTERVAL_MS = 5000 // 5 seconds
const MAX_POLL_DURATION_MS = 5 * 60 * 1000 // 5 minutes

interface UsePaymentPollingResult {
  status: PaymentStatus
  /** Elapsed time in seconds */
  elapsed: number
  /** Remaining time in seconds (until timeout) */
  remaining: number
  /** Payment method (for display) */
  paymentMethod: string | null
  /** Error message if polling failed */
  error: string | null
  /** Start polling */
  start: (paymentId: string) => void
  /** Stop polling */
  stop: () => void
  /** Reset to idle */
  reset: () => void
}

export function usePaymentPolling(): UsePaymentPollingResult {
  const [status, setStatus] = useState<PaymentStatus>("idle")
  const [elapsed, setElapsed] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const paymentIdRef = useRef<string | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stop = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current)
      elapsedTimerRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    stop()
    setStatus("idle")
    setElapsed(0)
    setPaymentMethod(null)
    setError(null)
    paymentIdRef.current = null
  }, [stop])

  const start = useCallback(
    (paymentId: string) => {
      // Stop any existing polling
      stop()
      paymentIdRef.current = paymentId
      setStatus("polling")
      setError(null)
      setElapsed(0)

      // ─── Poll payment status every 5 seconds ──────────────────────
      const poll = async () => {
        if (!paymentIdRef.current) return

        try {
          const res = await fetch(
            `/api/payments/status/${encodeURIComponent(paymentIdRef.current)}`
          )

          if (!res.ok) {
            throw new Error(`Status check failed (${res.status})`)
          }

          const data = await res.json()
          setPaymentMethod(data.payment?.method || null)

          if (data.status === "PAID") {
            setStatus("paid")
            stop()
          } else if (data.status === "FAILED") {
            setStatus("failed")
            setError(data.payment?.failureReason || "Payment failed")
            stop()
          }
          // If PENDING, keep polling
        } catch (err) {
          console.error("[Payment Polling] Error:", err)
          // Don't stop on network errors — keep retrying
        }
      }

      // Poll immediately, then every 5 seconds
      void poll()
      pollTimerRef.current = setInterval(poll, POLL_INTERVAL_MS)

      // Track elapsed time
      elapsedTimerRef.current = setInterval(() => {
        setElapsed((e) => e + 1)
      }, 1000)

      // Timeout after 5 minutes
      timeoutRef.current = setTimeout(() => {
        setStatus("timeout")
        setError("Payment confirmation timed out. Please check your phone or try again.")
        stop()
      }, MAX_POLL_DURATION_MS)
    },
    [stop]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  const remaining = Math.max(0, Math.floor(MAX_POLL_DURATION_MS / 1000) - elapsed)

  return {
    status,
    elapsed,
    remaining,
    paymentMethod,
    error,
    start,
    stop,
    reset,
  }
}
