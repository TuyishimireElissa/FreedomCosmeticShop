"use client"

/**
 * CheckoutView — 3-step multi-step checkout wizard.
 *
 * Step 1: DELIVERY INFO
 *   - Phone (auto-fill from account), name, district dropdown (all 30),
 *     sector (auto-populated by district), cell, landmark
 *   - Province auto-selected from district
 *   - Delivery fee auto-calculated by province
 *
 * Step 2: PAYMENT METHOD
 *   - MTN MoMo (most prominent) — phone + Pay Now + USSD waiting
 *   - Airtel Money — phone + same flow
 *   - Visa/Mastercard — card number, expiry, CVV → Flutterwave redirect
 *   - Cash on Delivery — Kigali only, amount reminder
 *   - Bank Transfer — shows BK, Equity, I&M account details
 *
 * Step 3: REVIEW & PLACE ORDER
 *   - Summary of delivery + payment + items
 *   - Place Order button → creates order → navigates to confirmation
 *
 * Features:
 *   - Step indicator (1 → 2 → 3)
 *   - Form validation per step
 *   - Loading states
 *   - Error handling
 *   - Coupon + loyalty from cart are carried over
 */

import { useState, useEffect, useMemo } from "react"
import { useStore } from "@/store/useStore"
import { usePaymentPolling } from "@/hooks/usePaymentPolling"
import {
  formatRWF,
  deliveryFeeFor,
  deliveryTimeFor,
  PAYMENT_METHODS,
  BANK_ACCOUNTS,
  type PaymentMethodKey,
} from "@/lib/format"
import { RWANDA_DISTRICTS, RWANDA_SECTORS, RWANDA_PROVINCES } from "@/lib/rwanda-locations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Check,
  ChevronRight,
  Truck,
  CreditCard,
  Smartphone,
  Banknote,
  Building,
  ShieldCheck,
  AlertCircle,
  Phone,
  MapPin,
  Clock,
} from "lucide-react"

// Map districts to provinces
const DISTRICT_TO_PROVINCE: Record<string, string> = {}
;(Object.keys(RWANDA_DISTRICTS) as (typeof RWANDA_PROVINCES)[number][]).forEach(
  (province) => {
    RWANDA_DISTRICTS[province].forEach((district) => {
      DISTRICT_TO_PROVINCE[district] = province
    })
  }
)

type Step = 1 | 2 | 3
type PayStatus = "idle" | "initiating" | "waiting" | "paid" | "failed"

interface DeliveryForm {
  customerName: string
  customerPhone: string
  customerEmail: string
  district: string
  sector: string
  cell: string
  address: string
  landmark: string
  notes: string
}

interface PaymentForm {
  method: PaymentMethodKey
  momoPhone: string
  cardNumber: string
  cardExpiry: string
  cardCvv: string
}

export function CheckoutView() {
  const {
    items,
    cartSubtotal,
    goCart,
    goCatalog,
    goConfirmation,
    clearCart,
    user,
    appliedCoupon,
    redeemPoints,
  } = useStore()
  const { toast } = useToast()

  const [step, setStep] = useState<Step>(1)
  const [submitting, setSubmitting] = useState(false)

  // ─── Delivery form ────────────────────────────────────────────────
  const [delivery, setDelivery] = useState<DeliveryForm>({
    customerName: user?.name || "",
    customerPhone: user?.phone || "",
    customerEmail: user?.email || "",
    district: "Nyarugenge",
    sector: "",
    cell: "",
    address: "",
    landmark: "",
    notes: "",
  })

  // Auto-fill from user when user loads
  useEffect(() => {
    if (user) {
      setDelivery((d) => ({
        ...d,
        customerName: d.customerName || user.name,
        customerPhone: d.customerPhone || user.phone,
        customerEmail: d.customerEmail || user.email || "",
      }))
    }
  }, [user])

  // Auto-populate sectors when district changes
  const availableSectors = useMemo(
    () => RWANDA_SECTORS[delivery.district] || [],
    [delivery.district]
  )

  // Auto-set province from district
  const province = DISTRICT_TO_PROVINCE[delivery.district] || "Kigali City"

  // ─── Payment form ─────────────────────────────────────────────────
  const [payment, setPayment] = useState<PaymentForm>({
    method: "MTN_MOMO",
    momoPhone: delivery.customerPhone,
    cardNumber: "",
    cardExpiry: "",
    cardCvv: "",
  })

  // Sync momoPhone with delivery phone
  useEffect(() => {
    setPayment((p) => ({ ...p, momoPhone: delivery.customerPhone }))
  }, [delivery.customerPhone])

  // Payment status (for MoMo/Card waiting)
  const [payStatus, setPayStatus] = useState<PayStatus>("idle")
  const polling = usePaymentPolling()

  // React to polling status changes
  useEffect(() => {
    if (polling.status === "paid") {
      setPayStatus("paid")
      toast({ title: "Payment confirmed!", description: "Placing your order..." })
    } else if (polling.status === "failed") {
      setPayStatus("failed")
      toast({
        title: "Payment failed",
        description: polling.error || "Please try again.",
        variant: "destructive",
      })
    } else if (polling.status === "timeout") {
      setPayStatus("failed")
      toast({
        title: "Payment timeout",
        description: "We didn't receive payment confirmation. Please try again.",
        variant: "destructive",
      })
    }
  }, [polling.status, polling.error, toast])

  // ─── Calculations ─────────────────────────────────────────────────
  const subtotal = cartSubtotal()
  const couponDiscount = appliedCoupon?.discountAmount || 0
  const loyaltyDiscount = Math.min(redeemPoints, Math.max(0, subtotal - couponDiscount))
  const totalDiscount = couponDiscount + loyaltyDiscount
  const deliveryFee = appliedCoupon?.freeShipping ? 0 : deliveryFeeFor(province)
  const total = Math.max(0, subtotal - totalDiscount + deliveryFee)

  // COD only in Kigali
  const codAvailable = province === "Kigali City"

  // ─── Validation ───────────────────────────────────────────────────
  const deliveryErrors: Record<string, string> = {}
  if (delivery.customerName.trim().length < 2)
    deliveryErrors.customerName = "Name is required"
  if (!/^(?:\+250|0)?7[2389][0-9]{7}$/.test(delivery.customerPhone.replace(/[\s-]/g, "")))
    deliveryErrors.customerPhone = "Enter a valid Rwandan phone (e.g. 0788123456)"
  if (delivery.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(delivery.customerEmail))
    deliveryErrors.customerEmail = "Invalid email"
  if (delivery.address.trim().length < 5)
    deliveryErrors.address = "Street address is required"
  if (!delivery.district) deliveryErrors.district = "Select your district"

  const deliveryValid = Object.keys(deliveryErrors).length === 0

  const paymentErrors: Record<string, string> = {}
  if (
    (payment.method === "MTN_MOMO" || payment.method === "AIRTEL_MONEY") &&
    !/^(?:\+250|0)?7[2389][0-9]{7}$/.test(payment.momoPhone.replace(/[\s-]/g, ""))
  ) {
    paymentErrors.momoPhone = "Enter a valid phone number"
  }
  // MTN: 078/079, Airtel: 072/073
  if (payment.method === "MTN_MOMO") {
    const cleanPhone = payment.momoPhone.replace(/[\s\-+]/g, "")
    const prefix = cleanPhone.replace(/^250|^0/, "").slice(0, 2)
    if (!["78", "79"].includes(prefix)) {
      paymentErrors.momoPhone = "MTN numbers start with 078 or 079"
    }
  }
  if (payment.method === "AIRTEL_MONEY") {
    const cleanPhone = payment.momoPhone.replace(/[\s\-+]/g, "")
    const prefix = cleanPhone.replace(/^250|^0/, "").slice(0, 2)
    if (!["72", "73"].includes(prefix)) {
      paymentErrors.momoPhone = "Airtel numbers start with 072 or 073"
    }
  }
  if (payment.method === "CARD") {
    if (payment.cardNumber.replace(/\s/g, "").length < 16)
      paymentErrors.cardNumber = "Enter 16-digit card number"
    if (!/^\d{2}\/\d{2}$/.test(payment.cardExpiry))
      paymentErrors.cardExpiry = "MM/YY format"
    if (payment.cardCvv.length < 3) paymentErrors.cardCvv = "3-digit CVV"
  }

  const paymentValid = Object.keys(paymentErrors).length === 0

  // ─── Step navigation ──────────────────────────────────────────────
  const goNext = () => {
    if (step === 1 && deliveryValid) setStep(2)
    else if (step === 2 && paymentValid) setStep(3)
  }
  const goBack = () => {
    if (step > 1) setStep((s) => (s - 1) as Step)
  }

  // ─── Initiate MoMo payment (with real orderId) ────────────────────
  const initiateMoMoPayment = async (orderId: string): Promise<boolean> => {
    setPayStatus("initiating")
    try {
      const network = payment.method === "MTN_MOMO" ? "MTN" : "AIRTEL"
      const res = await fetch("/api/payments/momo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          phone: payment.momoPhone,
          network,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setPayStatus("failed")
        toast({ title: "Payment failed", description: data.error, variant: "destructive" })
        return false
      }

      setPayStatus("waiting")
      toast({
        title: "Payment prompt sent!",
        description: `Approve the ${network} prompt on ${payment.momoPhone}.`,
      })

      // Start polling for UI feedback (progress bar, elapsed time)
      polling.start(data.transactionId)

      // Poll the API directly until we get a final status
      // (avoiding stale closure issues with React state)
      const paymentId = data.transactionId
      const startTime = Date.now()
      const maxWaitMs = 5 * 60 * 1000 // 5 minutes

      while (Date.now() - startTime < maxWaitMs) {
        await new Promise((r) => setTimeout(r, 3000)) // Poll every 3 seconds

        try {
          const statusRes = await fetch(`/api/payments/status/${paymentId}`)
          if (!statusRes.ok) continue
          const statusData = await statusRes.json()

          if (statusData.status === "PAID") {
            setPayStatus("paid")
            toast({ title: "Payment confirmed!", description: "Placing your order..." })
            return true
          }
          if (statusData.status === "FAILED") {
            setPayStatus("failed")
            toast({
              title: "Payment failed",
              description: statusData.payment?.failureReason || "Please try again.",
              variant: "destructive",
            })
            return false
          }
          // PENDING — keep polling
        } catch {
          // Network error — keep polling
        }
      }

      // Timeout
      setPayStatus("failed")
      toast({
        title: "Payment timeout",
        description: "We didn't receive payment confirmation. Please try again.",
        variant: "destructive",
      })
      return false
    } catch {
      setPayStatus("failed")
      toast({ title: "Payment failed", description: "Network error", variant: "destructive" })
      return false
    }
  }

  // ─── Place order ──────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" })
      goCatalog(null)
      return
    }

    setSubmitting(true)

    try {
      // Step 1: Create the order first
      const payload = {
        customerName: delivery.customerName.trim(),
        customerPhone: delivery.customerPhone.trim(),
        customerEmail: delivery.customerEmail.trim() || undefined,
        address: delivery.address.trim(),
        city: delivery.sector || delivery.district,
        province,
        district: delivery.district,
        sector: delivery.sector,
        cell: delivery.cell || undefined,
        landmark: delivery.landmark || undefined,
        notes: delivery.notes || undefined,
        paymentMethod: payment.method,
        couponCode: appliedCoupon?.code,
        useLoyaltyPoints: redeemPoints,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Order failed" }))
        throw new Error(err.error || "Failed to place order")
      }

      const data = await res.json()
      const orderId = data.order.id

      // Step 2: For MoMo/Airtel, initiate payment with the real orderId
      if (payment.method === "MTN_MOMO" || payment.method === "AIRTEL_MONEY") {
        const paid = await initiateMoMoPayment(orderId)
        if (!paid) {
          // Order was created but payment failed — user can retry from track page
          toast({
            title: "Payment failed",
            description: "Your order was placed but payment failed. You can retry from the order tracking page.",
            variant: "destructive",
          })
          clearCart()
          goConfirmation(orderId)
          return
        }
      }

      // Step 3: Success — clear cart and go to confirmation
      clearCart()
      goConfirmation(orderId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to place order"
      toast({ title: "Order failed", description: msg, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  // Empty cart guard
  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Add products before checking out.</p>
        <Button className="mt-6" onClick={() => goCatalog(null)}>
          Browse products
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Checkout</h1>
        <Button variant="ghost" size="sm" onClick={goCart}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to cart
        </Button>
      </div>

      {/* Step indicator */}
      <div className="mb-8 flex items-center justify-center">
        {[
          { num: 1, label: "Delivery", icon: Truck },
          { num: 2, label: "Payment", icon: CreditCard },
          { num: 3, label: "Review", icon: Check },
        ].map((s, i) => (
          <div key={s.num} className="flex items-center">
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                step >= s.num
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-background/20">
                {step > s.num ? <Check className="h-4 w-4" /> : s.num}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < 2 && (
              <ChevronRight
                className={`mx-1 h-5 w-5 ${
                  step > s.num ? "text-primary" : "text-muted-foreground"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ─── Main column: step content ─────────────────────────── */}
        <div className="lg:col-span-2">
          {/* Step 1: Delivery Info */}
          {step === 1 && (
            <div className="space-y-4 rounded-2xl border bg-card p-5">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Truck className="h-5 w-5 text-primary" /> Delivery information
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Where should we deliver your order?
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Name */}
                <div className="sm:col-span-2">
                  <Label htmlFor="c-name">Full name *</Label>
                  <Input
                    id="c-name"
                    value={delivery.customerName}
                    onChange={(e) => setDelivery({ ...delivery, customerName: e.target.value })}
                    placeholder="e.g. Aline Mugisha"
                    className={deliveryErrors.customerName ? "border-destructive" : ""}
                  />
                  {deliveryErrors.customerName && (
                    <p className="mt-1 text-xs text-destructive">{deliveryErrors.customerName}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <Label htmlFor="c-phone">Phone number *</Label>
                  <div className="relative mt-1">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="c-phone"
                      type="tel"
                      value={delivery.customerPhone}
                      onChange={(e) => setDelivery({ ...delivery, customerPhone: e.target.value })}
                      placeholder="0788123456"
                      className={`pl-9 ${deliveryErrors.customerPhone ? "border-destructive" : ""}`}
                    />
                  </div>
                  {deliveryErrors.customerPhone && (
                    <p className="mt-1 text-xs text-destructive">{deliveryErrors.customerPhone}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="c-email">Email (optional)</Label>
                  <Input
                    id="c-email"
                    type="email"
                    value={delivery.customerEmail}
                    onChange={(e) => setDelivery({ ...delivery, customerEmail: e.target.value })}
                    placeholder="you@example.com"
                    className={deliveryErrors.customerEmail ? "border-destructive" : ""}
                  />
                  {deliveryErrors.customerEmail && (
                    <p className="mt-1 text-xs text-destructive">{deliveryErrors.customerEmail}</p>
                  )}
                </div>

                {/* District */}
                <div>
                  <Label htmlFor="c-district">District *</Label>
                  <Select
                    value={delivery.district}
                    onValueChange={(v) =>
                      setDelivery({ ...delivery, district: v, sector: "" })
                    }
                  >
                    <SelectTrigger id="c-district">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(RWANDA_DISTRICTS).flat().map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Province: <span className="font-medium">{province}</span>
                  </p>
                </div>

                {/* Sector */}
                <div>
                  <Label htmlFor="c-sector">Sector</Label>
                  <Select
                    value={delivery.sector}
                    onValueChange={(v) => setDelivery({ ...delivery, sector: v })}
                  >
                    <SelectTrigger id="c-sector">
                      <SelectValue placeholder="Select sector" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSectors.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Cell */}
                <div>
                  <Label htmlFor="c-cell">Cell (optional)</Label>
                  <Input
                    id="c-cell"
                    value={delivery.cell}
                    onChange={(e) => setDelivery({ ...delivery, cell: e.target.value })}
                    placeholder="e.g. Ubumwe"
                  />
                </div>

                {/* Landmark */}
                <div>
                  <Label htmlFor="c-landmark">Landmark (optional)</Label>
                  <Input
                    id="c-landmark"
                    value={delivery.landmark}
                    onChange={(e) => setDelivery({ ...delivery, landmark: e.target.value })}
                    placeholder="e.g. Near KBC"
                  />
                </div>

                {/* Street address */}
                <div className="sm:col-span-2">
                  <Label htmlFor="c-address">Street address *</Label>
                  <Textarea
                    id="c-address"
                    value={delivery.address}
                    onChange={(e) => setDelivery({ ...delivery, address: e.target.value })}
                    placeholder="House number, street name, apartment..."
                    rows={2}
                    className={deliveryErrors.address ? "border-destructive" : ""}
                  />
                  {deliveryErrors.address && (
                    <p className="mt-1 text-xs text-destructive">{deliveryErrors.address}</p>
                  )}
                </div>

                {/* Notes */}
                <div className="sm:col-span-2">
                  <Label htmlFor="c-notes">Delivery notes (optional)</Label>
                  <Textarea
                    id="c-notes"
                    value={delivery.notes}
                    onChange={(e) => setDelivery({ ...delivery, notes: e.target.value })}
                    placeholder="e.g. Call when you arrive at the gate"
                    rows={2}
                  />
                </div>
              </div>

              {/* Delivery fee display */}
              <div className="flex items-center justify-between rounded-xl bg-secondary/40 p-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">
                      Delivery to {delivery.district}, {province}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {deliveryTimeFor(province)}
                    </p>
                  </div>
                </div>
                <span className="text-lg font-bold">
                  {appliedCoupon?.freeShipping ? (
                    <span className="text-emerald-600">FREE</span>
                  ) : (
                    formatRWF(deliveryFee)
                  )}
                </span>
              </div>

              {/* Continue */}
              <Button
                size="lg"
                className="w-full"
                onClick={goNext}
                disabled={!deliveryValid}
              >
                Continue to payment <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step 2: Payment Method */}
          {step === 2 && (
            <div className="space-y-4 rounded-2xl border bg-card p-5">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <CreditCard className="h-5 w-5 text-primary" /> Payment method
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose how you want to pay.
                </p>
              </div>

              <RadioGroup
                value={payment.method}
                onValueChange={(v) => {
                  setPayment({ ...payment, method: v as PaymentMethodKey })
                  setPayStatus("idle")
                }}
                className="space-y-3"
              >
                {/* MTN MoMo — most prominent */}
                <PaymentOption
                  value="MTN_MOMO"
                  current={payment.method}
                  icon={Smartphone}
                  iconColor="text-yellow-600"
                  label="MTN Mobile Money"
                  description="Pay instantly with MTN — get a prompt on your phone."
                  badge="Most popular"
                >
                  {payment.method === "MTN_MOMO" && (
                    <div className="mt-3">
                      <Label htmlFor="momo-phone">MTN phone number</Label>
                      <Input
                        id="momo-phone"
                        type="tel"
                        value={payment.momoPhone}
                        onChange={(e) => setPayment({ ...payment, momoPhone: e.target.value })}
                        placeholder="078XXXXXXX or 079XXXXXXX"
                        className={`mt-1 ${paymentErrors.momoPhone ? "border-destructive" : ""}`}
                      />
                      {paymentErrors.momoPhone && (
                        <p className="mt-1 text-xs text-destructive">{paymentErrors.momoPhone}</p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        You&apos;ll receive a USSD prompt to approve the payment.
                      </p>
                    </div>
                  )}
                </PaymentOption>

                {/* Airtel Money */}
                <PaymentOption
                  value="AIRTEL_MONEY"
                  current={payment.method}
                  icon={Smartphone}
                  iconColor="text-red-600"
                  label="Airtel Money"
                  description="Pay instantly with Airtel — get a prompt on your phone."
                >
                  {payment.method === "AIRTEL_MONEY" && (
                    <div className="mt-3">
                      <Label htmlFor="airtel-phone">Airtel phone number</Label>
                      <Input
                        id="airtel-phone"
                        type="tel"
                        value={payment.momoPhone}
                        onChange={(e) => setPayment({ ...payment, momoPhone: e.target.value })}
                        placeholder="072XXXXXXX or 073XXXXXXX"
                        className={`mt-1 ${paymentErrors.momoPhone ? "border-destructive" : ""}`}
                      />
                      {paymentErrors.momoPhone && (
                        <p className="mt-1 text-xs text-destructive">{paymentErrors.momoPhone}</p>
                      )}
                    </div>
                  )}
                </PaymentOption>

                {/* Card */}
                <PaymentOption
                  value="CARD"
                  current={payment.method}
                  icon={CreditCard}
                  iconColor="text-foreground"
                  label="Visa / Mastercard"
                  description="Secure card payment via Flutterwave (3D Secure)."
                >
                  {payment.method === "CARD" && (
                    <div className="mt-3 space-y-3">
                      <div>
                        <Label htmlFor="card-num">Card number</Label>
                        <Input
                          id="card-num"
                          value={payment.cardNumber}
                          onChange={(e) =>
                            setPayment({
                              ...payment,
                              cardNumber: e.target.value
                                .replace(/\D/g, "")
                                .replace(/(\d{4})(?=\d)/g, "$1 ")
                                .slice(0, 19),
                            })
                          }
                          placeholder="4242 4242 4242 4242"
                          className={`mt-1 ${paymentErrors.cardNumber ? "border-destructive" : ""}`}
                        />
                        {paymentErrors.cardNumber && (
                          <p className="mt-1 text-xs text-destructive">{paymentErrors.cardNumber}</p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="card-exp">Expiry</Label>
                          <Input
                            id="card-exp"
                            value={payment.cardExpiry}
                            onChange={(e) => {
                              let v = e.target.value.replace(/\D/g, "")
                              if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2, 4)
                              setPayment({ ...payment, cardExpiry: v })
                            }}
                            placeholder="MM/YY"
                            maxLength={5}
                            className={`mt-1 ${paymentErrors.cardExpiry ? "border-destructive" : ""}`}
                          />
                          {paymentErrors.cardExpiry && (
                            <p className="mt-1 text-xs text-destructive">{paymentErrors.cardExpiry}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="card-cvv">CVV</Label>
                          <Input
                            id="card-cvv"
                            type="password"
                            value={payment.cardCvv}
                            onChange={(e) =>
                              setPayment({
                                ...payment,
                                cardCvv: e.target.value.replace(/\D/g, "").slice(0, 4),
                              })
                            }
                            placeholder="123"
                            maxLength={4}
                            className={`mt-1 ${paymentErrors.cardCvv ? "border-destructive" : ""}`}
                          />
                          {paymentErrors.cardCvv && (
                            <p className="mt-1 text-xs text-destructive">{paymentErrors.cardCvv}</p>
                          )}
                        </div>
                      </div>
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                        You&apos;ll be redirected to Flutterwave&apos;s secure payment page.
                      </p>
                    </div>
                  )}
                </PaymentOption>

                {/* COD — Kigali only */}
                <PaymentOption
                  value="COD"
                  current={payment.method}
                  icon={Banknote}
                  iconColor="text-emerald-600"
                  label="Cash on Delivery"
                  description={codAvailable ? "Pay with cash when your order arrives." : "Kigali only"}
                  disabled={!codAvailable}
                >
                  {payment.method === "COD" && codAvailable && (
                    <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                      <p className="flex items-center gap-1.5 font-medium">
                        <AlertCircle className="h-4 w-4" /> Amount to pay on delivery:
                      </p>
                      <p className="mt-1 text-xl font-bold text-amber-900">{formatRWF(total)}</p>
                      <p className="mt-1 text-xs">
                        Please have the exact amount ready for the delivery driver.
                      </p>
                    </div>
                  )}
                </PaymentOption>

                {/* Bank Transfer */}
                <PaymentOption
                  value="BANK_TRANSFER"
                  current={payment.method}
                  icon={Building}
                  iconColor="text-blue-600"
                  label="Bank Transfer"
                  description="Transfer to our bank account. Order ships after confirmation."
                >
                  {payment.method === "BANK_TRANSFER" && (
                    <div className="mt-3 space-y-2">
                      {BANK_ACCOUNTS.map((bank) => (
                        <div key={bank.bank} className="rounded-lg border p-3 text-sm">
                          <p className="font-semibold">{bank.bank}</p>
                          <p className="text-muted-foreground">{bank.accountName}</p>
                          <p className="mt-1">
                            <span className="text-muted-foreground">A/C: </span>
                            <span className="font-mono font-medium">{bank.accountNumber}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">{bank.branch}</p>
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground">
                        After transferring, send the receipt to{" "}
                        <span className="font-medium">+250 788 123 456</span> via WhatsApp.
                        Your order ships once we confirm payment.
                      </p>
                    </div>
                  )}
                </PaymentOption>
              </RadioGroup>

              {/* Payment status indicator */}
              {payStatus === "waiting" && (
                <div className="rounded-xl bg-primary/10 p-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <div className="flex-1">
                      <p className="font-medium">Waiting for payment approval...</p>
                      <p className="text-sm text-muted-foreground">
                        Check your phone and approve the prompt.
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p className="font-mono font-medium text-primary">
                        {Math.floor(polling.elapsed / 60)}:{String(polling.elapsed % 60).padStart(2, "0")}
                      </p>
                      <p>elapsed</p>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary/20">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: `${Math.min(100, (polling.elapsed / 300) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1.5 text-center text-xs text-muted-foreground">
                    Auto-timeout in {Math.floor(polling.remaining / 60)}:{String(polling.remaining % 60).padStart(2, "0")}
                  </p>
                </div>
              )}
              {payStatus === "paid" && (
                <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4">
                  <Check className="h-6 w-6 text-emerald-600" />
                  <div>
                    <p className="font-medium text-emerald-800">Payment confirmed!</p>
                    <p className="text-sm text-emerald-600">Placing your order...</p>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex gap-3">
                <Button variant="outline" size="lg" onClick={goBack} className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button
                  size="lg"
                  onClick={goNext}
                  disabled={!paymentValid || payStatus === "waiting" || payStatus === "initiating"}
                  className="flex-1"
                >
                  Review order <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Place Order */}
          {step === 3 && (
            <div className="space-y-4 rounded-2xl border bg-card p-5">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Check className="h-5 w-5 text-primary" /> Review your order
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Please confirm everything looks correct.
                </p>
              </div>

              {/* Delivery info summary */}
              <div className="rounded-xl border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Delivery to</h3>
                  <button
                    onClick={() => setStep(1)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <p className="text-sm font-medium">{delivery.customerName}</p>
                <p className="text-sm text-muted-foreground">{delivery.customerPhone}</p>
                <p className="mt-1 text-sm">
                  {delivery.address}
                  {delivery.landmark && ` (Landmark: ${delivery.landmark})`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {delivery.sector || delivery.cell}, {delivery.district}, {province}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  🕐 {deliveryTimeFor(province)} · Delivery fee:{" "}
                  {appliedCoupon?.freeShipping ? "FREE" : formatRWF(deliveryFee)}
                </p>
              </div>

              {/* Payment method summary */}
              <div className="rounded-xl border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Payment method</h3>
                  <button
                    onClick={() => setStep(2)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <p className="text-sm font-medium">
                  {PAYMENT_METHODS[payment.method].label}
                </p>
                <p className="text-sm text-muted-foreground">
                  {PAYMENT_METHODS[payment.method].description}
                </p>
              </div>

              {/* Items summary */}
              <div className="rounded-xl border p-4">
                <h3 className="mb-2 text-sm font-semibold">
                  Items ({items.length})
                </h3>
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li key={item.productId} className="flex items-center gap-3 text-sm">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-secondary/30">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="line-clamp-1 text-xs font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatRWF(item.price)} × {item.quantity}
                        </p>
                      </div>
                      <p className="text-sm font-semibold">
                        {formatRWF(item.price * item.quantity)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Totals */}
              <div className="space-y-2 rounded-xl bg-secondary/30 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatRWF(subtotal)}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Coupon ({appliedCoupon?.code})</span>
                    <span>−{formatRWF(couponDiscount)}</span>
                  </div>
                )}
                {loyaltyDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Loyalty points</span>
                    <span>−{formatRWF(loyaltyDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span>{appliedCoupon?.freeShipping ? "FREE" : formatRWF(deliveryFee)}</span>
                </div>
                <div className="flex items-baseline justify-between border-t pt-2">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold">{formatRWF(total)}</span>
                </div>
              </div>

              {/* Place order */}
              <Button
                size="lg"
                className="w-full"
                onClick={handlePlaceOrder}
                disabled={submitting || payStatus === "waiting" || payStatus === "initiating"}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {payStatus === "waiting"
                      ? "Waiting for payment..."
                      : payStatus === "initiating"
                      ? "Initiating payment..."
                      : "Placing order..."}
                  </>
                ) : (
                  <>Place order · {formatRWF(total)}</>
                )}
              </Button>
              <Button variant="outline" size="sm" className="w-full" onClick={goBack}>
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to payment
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Your information is encrypted and secure.
              </p>
              {/* NEW: PayPack security badge + MoMo/Airtel logos */}
              <div className="mt-3 flex flex-col items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  🔒 Your payment is secured by <span className="font-medium text-foreground">PayPack Rwanda</span>
                </p>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 rounded-md bg-yellow-400/10 px-2 py-1 text-xs font-medium">
                    📱 MTN MoMo
                  </span>
                  <span className="flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-1 text-xs font-medium">
                    📲 Airtel Money
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Sticky order summary ────────────────────────────────── */}
        <aside className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Order summary</h2>

            {/* Items count */}
            <p className="mt-1 text-sm text-muted-foreground">
              {items.length} item{items.length !== 1 ? "s" : ""} ·{" "}
              {items.reduce((s, i) => s + i.quantity, 0)} units
            </p>

            {/* Item list (compact) */}
            <ul className="mt-4 max-h-48 space-y-2 overflow-y-auto ub-scroll pr-1">
              {items.map((item) => (
                <li key={item.productId} className="flex gap-2 text-sm">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-secondary/30">
                    {item.image && (
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    )}
                    <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="line-clamp-2 text-xs font-medium leading-snug">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatRWF(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">{formatRWF(item.price * item.quantity)}</p>
                </li>
              ))}
            </ul>

            {/* Totals */}
            <div className="mt-4 space-y-2 border-t pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatRWF(subtotal)}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Coupon</span>
                  <span>−{formatRWF(couponDiscount)}</span>
                </div>
              )}
              {loyaltyDiscount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Loyalty</span>
                  <span>−{formatRWF(loyaltyDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <span>{appliedCoupon?.freeShipping ? "FREE" : formatRWF(deliveryFee)}</span>
              </div>
              <div className="flex items-baseline justify-between border-t pt-2">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold">{formatRWF(total)}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

/**
 * Payment option radio card.
 */
function PaymentOption({
  value,
  current,
  icon: Icon,
  iconColor,
  label,
  description,
  badge,
  disabled,
  children,
}: {
  value: string
  current: string
  icon: React.ElementType
  iconColor: string
  label: string
  description: string
  badge?: string
  disabled?: boolean
  children?: React.ReactNode
}) {
  const isSelected = current === value
  return (
    <label
      htmlFor={`pay-${value}`}
      className={`block rounded-xl border-2 p-4 transition-colors ${
        disabled
          ? "cursor-not-allowed border-border opacity-50"
          : isSelected
          ? "border-primary bg-secondary/30"
          : "border-border hover:border-primary/40"
      }`}
    >
      <div className="flex items-start gap-3">
        <RadioGroupItem value={value} id={`pay-${value}`} className="mt-1" disabled={disabled} />
        <Icon className={`mt-0.5 h-5 w-5 ${iconColor}`} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{label}</span>
            {badge && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                {badge}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          {children}
        </div>
      </div>
    </label>
  )
}
