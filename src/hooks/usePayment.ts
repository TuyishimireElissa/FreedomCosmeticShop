"use client"

/**
 * usePayment — custom hook for MTN MoMo + Airtel Money payment flow.
 *
 * Features:
 *   - initiateMoMoPayment(phone, amount, orderId) → starts payment
 *   - pollPaymentStatus(transactionRef) → polls every 5s, stops after 5min
 *   - handlePaymentSuccess() → called when payment is confirmed
 *   - handlePaymentFailure() → called when payment fails
 *   - cancelPayment() → stops polling
 *
 * Usage:
 *   const { status, initiate, cancel, error } = usePayment()
 *   await initiate({ phone: "0788123456", amount: 25000, orderId: "xxx", network: "MTN" })
 */

import { useState, useRef, useCallback, useEffect } from "react"

type PaymentStatus = "idle" | "initiating" | "waiting" | "success" | "failed" | "timeout"

interface InitiateParams {
  phone: string
  amount: number
  orderId: string
  network: "MTN" | "AIRTEL"
}

interface UsePaymentResult {
  status: PaymentStatus
  error: string | null
  transactionRef: string | null
  elapsedSeconds: number
  remainingSeconds: number
  initiate: (params: InitiateParams) => Promise<boolean>
  cancel: () => void
  reset: () => void
}

const POLL_INTERVAL_MS = 5000
const MAX_POLL_DURATION_MS = 5 * 60 * 1000 // 5 minutes

export function usePayment(): UsePaymentResult {
  const [status, setStatus] = useState<PaymentStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [transactionRef, setTransactionRef] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const transactionRefRef = useRef<string | null>(null)

  const remainingSeconds = Math.max(0, Math.floor(MAX_POLL_DURATION_MS / 1000) - elapsedSeconds)

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

  const cancel = useCallback(() => {
    stop()
    setStatus("idle")
    setError(null)
    setTransactionRef(null)
    setElapsedSeconds(0)
  }, [stop])

  const reset = useCallback(() => {
    stop()
    setStatus("idle")
    setError(null)
    setTransactionRef(null)
    setElapsedSeconds(0)
    transactionRefRef.current = null
  }, [stop])

  const initiate = useCallback(
    async (params: InitiateParams): Promise<boolean> => {
      const { phone, orderId, network } = params

      setStatus("initiating")
      setError(null)
      setElapsedSeconds(0)

      try {
        // Call the existing /api/payments/momo endpoint
        const res = await fetch("/api/payments/momo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            phone,
            network,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          setStatus("failed")
          setError(data.error || "Failed to initiate payment")
          return false
        }

        // Payment initiated — start polling
        setTransactionRef(data.transactionId)
        transactionRefRef.current = data.transactionId
        setStatus("waiting")

        // Track elapsed time
        elapsedTimerRef.current = setInterval(() => {
          setElapsedSeconds((s) => s + 1)
        }, 1000)

        // Poll payment status every 5 seconds
        const poll = async () => {
          if (!transactionRefRef.current) return

          try {
            const statusRes = await fetch(
              `/api/payments/status/${transactionRefRef.current}`
            )
            if (!statusRes.ok) return

            const statusData = await statusRes.json()

            if (statusData.status === "PAID") {
              setStatus("success")
              stop()
            } else if (statusData.status === "FAILED") {
              setStatus("failed")
              setError(statusData.payment?.failureReason || "Payment failed")
              stop()
            }
            // PENDING → keep polling
          } catch {
            // Network error — keep polling
          }
        }

        // Start polling immediately, then every 5 seconds
        void poll()
        pollTimerRef.current = setInterval(poll, POLL_INTERVAL_MS)

        // Timeout after 5 minutes
        timeoutRef.current = setTimeout(() => {
          setStatus("timeout")
          setError("Payment timed out. Please try again.")
          stop()
        }, MAX_POLL_DURATION_MS)

        return true
      } catch (err) {
        setStatus("failed")
        setError(err instanceof Error ? err.message : "Network error")
        return false
      }
    },
    [stop]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => stop()
  }, [stop])

  return {
    status,
    error,
    transactionRef,
    elapsedSeconds,
    remainingSeconds,
    initiate,
    cancel,
    reset,
  }
}
