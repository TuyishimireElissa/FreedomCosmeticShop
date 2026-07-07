"use client"

/**
 * PaymentMethodSelector — standalone payment method selector for checkout.
 *
 * This is a REUSABLE component that can be dropped into any checkout flow.
 * The existing CheckoutView.tsx already has payment methods built in —
 * this component provides an alternative UI for projects that want a
 * separate, self-contained payment selector.
 *
 * Features:
 *   - 4 payment methods: MTN MoMo (default), Airtel, Card, COD
 *   - MTN MoMo phone input with validation (078/079)
 *   - Airtel phone input with validation (072/073)
 *   - "Pay X RWF" button → triggers MoMo flow
 *   - Waiting animation with countdown timer (5 min)
 *   - Success state with order confirmation
 *   - Failure state with retry option
 *   - Uses usePayment hook for payment logic
 *
 * Usage:
 *   <PaymentMethodSelector
 *     orderId="order-id"
 *     amount={25000}
 *     onPaymentSuccess={() => goToConfirmation()}
 *   />
 */

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { usePayment } from "@/hooks/usePayment"
import {
  validateMTNPhone,
  validateAirtelPhone,
  formatRWF,
} from "@/lib/paypack"
import {
  Smartphone,
  CreditCard,
  Banknote,
  CheckCircle2,
  Loader2,
  XCircle,
  Clock,
  AlertCircle,
  ArrowRight,
} from "lucide-react"

type Method = "MTN_MOMO" | "AIRTEL_MONEY" | "CARD" | "COD"

interface PaymentMethodSelectorProps {
  orderId: string
  amount: number
  onPaymentSuccess?: (transactionRef: string) => void
  onPaymentFailure?: (error: string) => void
  /** COD available? (Kigali only) */
  codAvailable?: boolean
}

export function PaymentMethodSelector({
  orderId,
  amount,
  onPaymentSuccess,
  onPaymentFailure,
  codAvailable = true,
}: PaymentMethodSelectorProps) {
  const [method, setMethod] = useState<Method>("MTN_MOMO")
  const [momoPhone, setMomoPhone] = useState("")
  const [airtelPhone, setAirtelPhone] = useState("")
  const [phoneError, setPhoneError] = useState<string | null>(null)

  const { status, error, transactionRef, elapsedSeconds, remainingSeconds, initiate, cancel, reset } =
    usePayment()

  // React to payment status changes
  useEffect(() => {
    if (status === "success" && transactionRef) {
      onPaymentSuccess?.(transactionRef)
    } else if (status === "failed" && error) {
      onPaymentFailure?.(error)
    }
  }, [status, transactionRef, error, onPaymentSuccess, onPaymentFailure])

  const handlePay = async () => {
    setPhoneError(null)

    if (method === "MTN_MOMO") {
      if (!validateMTNPhone(momoPhone)) {
        setPhoneError("Enter a valid MTN number (078 or 079)")
        return
      }
      const success = await initiate({
        phone: momoPhone,
        amount,
        orderId,
        network: "MTN",
      })
      if (!success && status === "failed") {
        onPaymentFailure?.(error || "Payment failed")
      }
    } else if (method === "AIRTEL_MONEY") {
      if (!validateAirtelPhone(airtelPhone)) {
        setPhoneError("Enter a valid Airtel number (072 or 073)")
        return
      }
      const success = await initiate({
        phone: airtelPhone,
        amount,
        orderId,
        network: "AIRTEL",
      })
      if (!success && status === "failed") {
        onPaymentFailure?.(error || "Payment failed")
      }
    }
  }

  const handleRetry = () => {
    reset()
  }

  // ─── Payment in progress ──────────────────────────────────────────
  if (status === "waiting" || status === "initiating") {
    return (
      <div className="rounded-2xl border bg-card p-6 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-primary/10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <h3 className="text-lg font-bold">Waiting for payment approval</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Check your phone and approve the {method === "MTN_MOMO" ? "MTN MoMo" : "Airtel Money"} prompt
          to complete your payment of <strong>{formatRWF(amount)}</strong>.
        </p>

        {/* Countdown timer */}
        <div className="mx-auto mt-4 max-w-xs">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Elapsed: {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, "0")}</span>
            <span>Remaining: {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, "0")}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(elapsedSeconds / 300) * 100}%` }}
            />
          </div>
        </div>

        <Button variant="outline" className="mt-4" onClick={cancel}>
          <XCircle className="mr-2 h-4 w-4" /> Cancel Payment
        </Button>
      </div>
    )
  }

  // ─── Payment success ──────────────────────────────────────────────
  if (status === "success") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h3 className="text-lg font-bold text-emerald-900">Payment Successful!</h3>
        <p className="mt-2 text-sm text-emerald-700">
          {formatRWF(amount)} received
        </p>
        <p className="mt-1 text-xs text-emerald-600">
          Order confirmed · SMS sent to your phone
        </p>
        <Button
          className="mt-4 bg-emerald-600 hover:bg-emerald-700"
          onClick={() => onPaymentSuccess?.(transactionRef || "")}
        >
          View My Order <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    )
  }

  // ─── Payment failed ───────────────────────────────────────────────
  if (status === "failed" || status === "timeout") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-red-100">
          <XCircle className="h-8 w-8 text-red-600" />
        </div>
        <h3 className="text-lg font-bold text-red-900">Payment Failed</h3>
        <p className="mt-2 text-sm text-red-700">
          {error || "Payment could not be completed. Please try again."}
        </p>
        <Button variant="outline" className="mt-4" onClick={handleRetry}>
          Try Again
        </Button>
      </div>
    )
  }

  // ─── Payment method selection (default state) ─────────────────────
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Select Payment Method</h3>
        <p className="text-sm text-muted-foreground">Choose how you want to pay</p>
      </div>

      <RadioGroup
        value={method}
        onValueChange={(v) => {
          setMethod(v as Method)
          setPhoneError(null)
        }}
        className="space-y-3"
      >
        {/* MTN MoMo — most prominent */}
        <label
          htmlFor="pay-mtn"
          className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors ${
            method === "MTN_MOMO" ? "border-primary bg-secondary/30" : "border-border hover:border-primary/40"
          }`}
        >
          <RadioGroupItem value="MTN_MOMO" id="pay-mtn" className="mt-1" />
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-yellow-400 text-2xl">📱</span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">MTN Mobile Money</span>
              <Badge className="bg-primary/10 text-xs text-primary">Most Popular</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Pay instantly with MTN — get a prompt on your phone</p>
          </div>
        </label>

        {/* MTN phone input */}
        {method === "MTN_MOMO" && (
          <div className="ml-8 rounded-lg border bg-card p-3">
            <Label htmlFor="momo-phone" className="text-xs">MTN MoMo Number</Label>
            <Input
              id="momo-phone"
              type="tel"
              value={momoPhone}
              onChange={(e) => setMomoPhone(e.target.value)}
              placeholder="078XXXXXXX or 079XXXXXXX"
              className={`mt-1 ${phoneError ? "border-destructive" : ""}`}
            />
            {phoneError && <p className="mt-1 text-xs text-destructive">{phoneError}</p>}
            <p className="mt-1 text-xs text-muted-foreground">⚠️ Use the number registered for MTN Mobile Money</p>
            <Button className="mt-3 w-full" onClick={handlePay}>
              Pay {formatRWF(amount)} with MoMo
            </Button>
          </div>
        )}

        {/* Airtel Money */}
        <label
          htmlFor="pay-airtel"
          className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors ${
            method === "AIRTEL_MONEY" ? "border-primary bg-secondary/30" : "border-border hover:border-primary/40"
          }`}
        >
          <RadioGroupItem value="AIRTEL_MONEY" id="pay-airtel" className="mt-1" />
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-red-500 text-2xl">📲</span>
          <div className="flex-1">
            <span className="font-medium">Airtel Money</span>
            <p className="text-sm text-muted-foreground">Pay with Airtel — same flow as MTN</p>
          </div>
        </label>

        {/* Airtel phone input */}
        {method === "AIRTEL_MONEY" && (
          <div className="ml-8 rounded-lg border bg-card p-3">
            <Label htmlFor="airtel-phone" className="text-xs">Airtel Money Number</Label>
            <Input
              id="airtel-phone"
              type="tel"
              value={airtelPhone}
              onChange={(e) => setAirtelPhone(e.target.value)}
              placeholder="072XXXXXXX or 073XXXXXXX"
              className={`mt-1 ${phoneError ? "border-destructive" : ""}`}
            />
            {phoneError && <p className="mt-1 text-xs text-destructive">{phoneError}</p>}
            <Button className="mt-3 w-full" onClick={handlePay}>
              Pay {formatRWF(amount)} with Airtel
            </Button>
          </div>
        )}

        {/* Card */}
        <label
          htmlFor="pay-card"
          className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors ${
            method === "CARD" ? "border-primary bg-secondary/30" : "border-border hover:border-primary/40"
          }`}
        >
          <RadioGroupItem value="CARD" id="pay-card" className="mt-1" />
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-gray-800 text-2xl">💳</span>
          <div className="flex-1">
            <span className="font-medium">Visa / Mastercard</span>
            <p className="text-sm text-muted-foreground">Secure card payment via Flutterwave</p>
          </div>
        </label>

        {/* COD */}
        <label
          htmlFor={`pay-cod ${!codAvailable ? "cursor-not-allowed opacity-50" : ""}`}
          className={`flex items-start gap-3 rounded-xl border-2 p-4 transition-colors ${
            method === "COD" && codAvailable
              ? "border-primary bg-secondary/30"
              : "border-border"
          } ${!codAvailable ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-primary/40"}`}
        >
          <RadioGroupItem value="COD" id="pay-cod" className="mt-1" disabled={!codAvailable} />
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500 text-2xl">💵</span>
          <div className="flex-1">
            <span className="font-medium">Cash on Delivery</span>
            <p className="text-sm text-muted-foreground">
              {codAvailable ? "Pay with cash when your order arrives" : "Kigali only"}
            </p>
          </div>
        </label>
      </RadioGroup>
    </div>
  )
}
