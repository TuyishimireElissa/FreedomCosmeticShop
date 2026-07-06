"use client"

/**
 * CheckoutView — 3-step multi-step checkout wizard.
 *
 * Step 1: DELIVERY INFO
 *   - Phone (auto-fill from account)
 *   - Full name
 *   - District dropdown (all 30 districts)
 *   - Sector (auto-populated based on district)
 *   - Cell
 *   - Landmark
 *   - Province auto-selected from district
 *   - Delivery fee auto-calculated
 *
 * Step 2: PAYMENT METHOD
 *   - MTN MoMo (most prominent) — phone → USSD push → waiting → confirmed
 *   - Airtel Money — same flow
 *   - Visa/Mastercard — redirect to Flutterwave
 *   - Cash on Delivery — Kigali only
 *   - Bank Transfer — show bank details
 *
 * Step 3: ORDER REVIEW
 *   - Review all items + delivery + payment
 *   - Place order → creates order + initiates payment
 *   - On success → navigate to confirmation
 *
 * Features:
 *   - Form validation per step
 *   - Loading states
 *   - Error handling
 *   - Payment polling (for MoMo/Card)
 *   - Province auto-detection from district
 */

import { useState, useEffect } from "react"
import { useStore } from "@/store/useStore"
import {
  formatRWF,
  deliveryFeeFor,
  deliveryTimeFor,
  PAYMENT_METHODS,
  BANK_ACCOUNTS,
  type PaymentMethodKey,
} from "@/lib/format"
import {
  RWANDA_DISTRICTS,
  RWANDA_SECTORS,
} from "@/lib/rwanda-locations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
  Smartphone,
  Banknote,
  CreditCard,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  ShieldCheck,
  MapPin,
  Copy,
} from "lucide-react"

type Step = 1 | 2 | 3
type PaymentMethod = PaymentMethodKey

interface FormState {
  customerName: string
  customerPhone: string
  customerEmail: string
  district: string
  sector: string
  cell: string
  landmark: string
  notes: string
}

interface Errors {
  [key: string]: string
}

export function CheckoutView() {
  const {
    items,
    cartSubtotal,
    appliedCoupon,
    redeemPoints,
    goCart,
    goCatalog,
    goConfirmation,
    clearCart,
    user,
  } = useStore()
  const { toast } = useToast()

  const [step, setStep] = useState<Step>(1)
  const [submitting, setSubmitting] = useState(false)
  const [createdOrder, setCreatedOrder] = useState<{
    id: string
    orderNumber: string
    total: number
  } | null>(null)

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("MTN_MOMO")
  const [momoPhone, setMomoPhone] = useState("")
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "initiating" | "waiting" | "polling" | "paid" | "failed"
  >("idle")
  const [paymentMessage, setPaymentMessage] = useState("")

  // Form
  const [form, setForm] = useState<FormState>({
    customerName: user?.name || "",
    customerPhone: user?.phone || "",
    customerEmail: user?.email || "",
    district: "Nyarugenge",
    sector: "",
    cell: "",
    landmark: "",
    notes: "",
  })
  const [errors, setErrors] = useState<Errors>({})

  // Auto-fill from user on mount
  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        customerName: f.customerName || user.name,
        customerPhone: f.customerPhone || user.phone,
        customerEmail: f.customerEmail || user.email || "",
      }))
      setMomoPhone(user.phone)
    }
  }, [user])

  // Province auto-detected from district
  const province = (() => {
    for (const [prov, districts] of Object.entries(RWANDA_DISTRICTS)) {
      if (districts.includes(form.district)) return prov
    }
    return "Kigali City"
  })()

  // Sectors for selected district
  const availableSectors = RWANDA_SECTORS[form.district] || []

  // Delivery calculation
  const subtotal = cartSubtotal()
  const couponDiscount = appliedCoupon?.discountAmount || 0
  const freeShipping = appliedCoupon?.freeShipping || false
  const baseDeliveryFee = deliveryFeeFor(province)
  const deliveryFee = freeShipping ? 0 : baseDeliveryFee
  const loyaltyDiscount = Math.min(
    redeemPoints * 10,
    subtotal - couponDiscount
  )
  const total = Math.max(0, subtotal - couponDiscount - loyaltyDiscount + deliveryFee)

  // COD only available in Kigali
  const codAvailable = province === "Kigali City"

  // Auto-switch off COD if not Kigali
  useEffect(() => {
    if (paymentMethod === "COD" && !codAvailable) {
      setPaymentMethod("MTN_MOMO")
      toast({
        title: "COD not available",
        description: "Cash on Delivery is only available in Kigali. Switched to MTN MoMo.",
        variant: "destructive",
      })
    }
  }, [province, paymentMethod, codAvailable, toast])

  // ─── Validation ────────────────────────────────────────────────────
  const validateStep1 = (): boolean => {
    const e: Errors = {}
    if (form.customerName.trim().length < 2) e.customerName = "Enter your full name"
    if (!/^(?:\+250|0)?7[2389][0-9]{7}$/.test(form.customerPhone.replace(/[\s-]/g, "")))
      e.customerPhone = "Enter a valid Rwandan phone (e.g. 0788123456)"
    if (form.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail))
      e.customerEmail = "Enter a valid email or leave blank"
    if (!form.district) e.district = "Select your district"
    if (!form.sector) e.sector = "Select your sector"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const setField = (field: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) {
      setErrors((e) => {
        const next = { ...e }
        delete next[field]
        return next
      })
    }
  }

  // ─── Place order (creates order, then initiates payment) ──────────
  const handlePlaceOrder = async () => {
    setSubmitting(true)
    setPaymentStatus("initiating")
    setPaymentMessage("Creating your order...")

    try {
      // Create the order
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.customerName.trim(),
          customerPhone: form.customerPhone.trim(),
          customerEmail: form.customerEmail.trim() || undefined,
          address: `${form.cell ? form.cell + ", " : ""}${form.sector}, ${form.district}${form.landmark ? " (" + form.landmark + ")" : ""}`,
          city: form.district,
          province,
          district: form.district,
          sector: form.sector,
          cell: form.cell,
          landmark: form.landmark,
          notes: form.notes,
          paymentMethod,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          couponCode: appliedCoupon?.code,
          redeemLoyaltyPoints: redeemPoints,
        }),
      })

      const orderData = await orderRes.json()
      if (!orderRes.ok) {
        throw new Error(orderData.error || "Failed to create order")
      }

      const orderId = orderData.order.id
      const orderNumber = orderData.order.orderNumber
      setCreatedOrder({ id: orderId, orderNumber, total: orderData.order.total })

      // For COD or Bank Transfer, no payment initiation needed
      if (paymentMethod === "COD" || paymentMethod === "BANK_TRANSFER") {
        setPaymentStatus("paid")
        setPaymentMessage(
          paymentMethod === "COD"
            ? "Order placed! Pay with cash on delivery."
            : "Order placed! Please transfer to our bank account."
        )
        clearCart()
        setTimeout(() => goConfirmation(orderId), 1500)
        return
      }

      // Initiate payment (MoMo or Card)
      setPaymentStatus("initiating")
      setPaymentMessage(
        paymentMethod === "MTN_MOMO" || paymentMethod === "AIRTEL_MONEY"
          ? "Sending payment prompt to your phone..."
          : "Redirecting to secure payment..."
      )

      let payRes
      if (paymentMethod === "MTN_MOMO" || paymentMethod === "AIRTEL_MONEY") {
        payRes = await fetch("/api/payments/momo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            phone: momoPhone,
            network: paymentMethod === "MTN_MOMO" ? "MTN" : "AIRTEL",
          }),
        })
      } else if (paymentMethod === "CARD") {
        payRes = await fetch("/api/payments/card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        })
      }

      const payData = await payRes!.json()
      if (!payRes!.ok || !payData.success) {
        throw new Error(payData.error || "Payment initiation failed")
      }

      // For card payments with redirect link
      if (paymentMethod === "CARD" && payData.paymentLink) {
        window.location.href = payData.paymentLink
        return
      }

      // Poll payment status
      setPaymentStatus("polling")
      setPaymentMessage("Waiting for payment confirmation...")
      const txId = payData.transactionId

      let attempts = 0
      const maxAttempts = 30 // 30 × 2s = 60s timeout
      const poll = async () => {
        attempts++
        try {
          const statusRes = await fetch(`/api/payments/status/${txId}`)
          const statusData = await statusRes.json()
          if (statusData.status === "PAID") {
            setPaymentStatus("paid")
            setPaymentMessage("Payment confirmed! 🎉")
            clearCart()
            setTimeout(() => goConfirmation(orderId), 1500)
            return
          }
          if (statusData.status === "FAILED") {
            setPaymentStatus("failed")
            setPaymentMessage("Payment failed. Please try again.")
            return
          }
          if (attempts < maxAttempts) {
            setTimeout(poll, 2000)
          } else {
            setPaymentStatus("failed")
            setPaymentMessage("Payment timeout. Check your phone and try again.")
          }
        } catch {
          if (attempts < maxAttempts) {
            setTimeout(poll, 2000)
          }
        }
      }
      setTimeout(poll, 2000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Checkout failed"
      toast({ title: "Checkout failed", description: msg, variant: "destructive" })
      setPaymentStatus("failed")
      setPaymentMessage(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // Empty cart guard
  if (items.length === 0 && !createdOrder) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Add products before checking out.</p>
        <Button className="mt-6" onClick={() => goCatalog(null)}>Browse products</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header + step indicator */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Checkout</h1>
        <Button variant="ghost" size="sm" onClick={goCart} disabled={submitting}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to cart
        </Button>
      </div>

      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold transition-colors ${
                s < step
                  ? "bg-emerald-500 text-white"
                  : s === step
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {s < step ? <Check className="h-4 w-4" /> : s}
            </div>
            <span
              className={`hidden text-sm font-medium sm:inline ${
                s === step ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {s === 1 ? "Delivery" : s === 2 ? "Payment" : "Review"}
            </span>
            {s < 3 && (
              <div
                className={`h-0.5 flex-1 rounded ${s < step ? "bg-emerald-500" : "bg-border"}`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ─── Left: Step content ───────────────────────────────── */}
        <div className="space-y-4 lg:col-span-2">
          {/* ─── STEP 1: DELIVERY INFO ───────────────────────────── */}
          {step === 1 && (
            <section className="rounded-2xl border bg-card p-5">
              <h2 className="text-lg font-semibold">Delivery information</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Where should we deliver your order?
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="co-name">
                    Full name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="co-name"
                    value={form.customerName}
                    onChange={(e) => setField("customerName", e.target.value)}
                    placeholder="e.g. Aline Mugisha"
                    className={errors.customerName ? "border-destructive" : ""}
                    autoComplete="name"
                  />
                  {errors.customerName && (
                    <p className="mt-1 text-xs text-destructive">{errors.customerName}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="co-phone">
                    Phone number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="co-phone"
                    type="tel"
                    value={form.customerPhone}
                    onChange={(e) => setField("customerPhone", e.target.value)}
                    placeholder="0788123456"
                    className={errors.customerPhone ? "border-destructive" : ""}
                    autoComplete="tel"
                  />
                  {errors.customerPhone && (
                    <p className="mt-1 text-xs text-destructive">{errors.customerPhone}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="co-email">Email (optional)</Label>
                  <Input
                    id="co-email"
                    type="email"
                    value={form.customerEmail}
                    onChange={(e) => setField("customerEmail", e.target.value)}
                    placeholder="you@example.com"
                    className={errors.customerEmail ? "border-destructive" : ""}
                    autoComplete="email"
                  />
                  {errors.customerEmail && (
                    <p className="mt-1 text-xs text-destructive">{errors.customerEmail}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="co-district">
                    District <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={form.district}
                    onValueChange={(v) => {
                      setField("district", v)
                      setField("sector", "") // Reset sector on district change
                    }}
                  >
                    <SelectTrigger id="co-district" className={errors.district ? "border-destructive" : ""}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {Object.values(RWANDA_DISTRICTS).flat().map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.district && (
                    <p className="mt-1 text-xs text-destructive">{errors.district}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="co-sector">
                    Sector <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={form.sector}
                    onValueChange={(v) => setField("sector", v)}
                    disabled={availableSectors.length === 0}
                  >
                    <SelectTrigger id="co-sector" className={errors.sector ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select sector" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {availableSectors.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.sector && (
                    <p className="mt-1 text-xs text-destructive">{errors.sector}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="co-cell">Cell (optional)</Label>
                  <Input
                    id="co-cell"
                    value={form.cell}
                    onChange={(e) => setField("cell", e.target.value)}
                    placeholder="e.g. Akabuga"
                  />
                </div>

                <div>
                  <Label htmlFor="co-landmark">Landmark (optional)</Label>
                  <Input
                    id="co-landmark"
                    value={form.landmark}
                    onChange={(e) => setField("landmark", e.target.value)}
                    placeholder="e.g. Near KBC"
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="co-notes">Delivery notes (optional)</Label>
                  <Textarea
                    id="co-notes"
                    value={form.notes}
                    onChange={(e) => setField("notes", e.target.value)}
                    placeholder="e.g. Call when you arrive at the gate"
                    rows={2}
                    maxLength={500}
                  />
                </div>
              </div>

              {/* Province + delivery fee display */}
              <div className="mt-4 flex items-center justify-between rounded-lg bg-secondary/40 px-4 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">Province: </span>
                  <span className="font-medium">{province}</span>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatRWF(deliveryFee)}</p>
                  <p className="text-xs text-muted-foreground">{deliveryTimeFor(province)}</p>
                </div>
              </div>

              <Button
                size="lg"
                className="mt-4 w-full"
                onClick={() => {
                  if (validateStep1()) setStep(2)
                }}
              >
                Continue to payment
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </section>
          )}

          {/* ─── STEP 2: PAYMENT METHOD ──────────────────────────── */}
          {step === 2 && (
            <section className="rounded-2xl border bg-card p-5">
              <h2 className="text-lg font-semibold">Payment method</h2>
              <p className="mt-1 text-sm text-muted-foreground">Choose how you want to pay.</p>

              <RadioGroup
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                className="mt-4 space-y-3"
              >
                {/* MTN MoMo (most prominent) */}
                <PaymentOption
                  value="MTN_MOMO"
                  label={PAYMENT_METHODS.MTN_MOMO.label}
                  description={PAYMENT_METHODS.MTN_MOMO.description}
                  icon={<Smartphone className="h-5 w-5" />}
                  badge="Recommended"
                  selected={paymentMethod === "MTN_MOMO"}
                >
                  {paymentMethod === "MTN_MOMO" && (
                    <div className="mt-3 rounded-lg bg-yellow-50 p-3">
                      <Label htmlFor="mtn-phone" className="text-xs">
                        MTN phone number
                      </Label>
                      <Input
                        id="mtn-phone"
                        type="tel"
                        value={momoPhone}
                        onChange={(e) => setMomoPhone(e.target.value)}
                        placeholder="078XXXXXXX or 079XXXXXXX"
                        className="mt-1 h-9"
                      />
                      <p className="mt-1.5 text-xs text-yellow-700">
                        You&apos;ll receive a prompt on your phone to approve the payment.
                      </p>
                    </div>
                  )}
                </PaymentOption>

                {/* Airtel Money */}
                <PaymentOption
                  value="AIRTEL_MONEY"
                  label={PAYMENT_METHODS.AIRTEL_MONEY.label}
                  description={PAYMENT_METHODS.AIRTEL_MONEY.description}
                  icon={<Smartphone className="h-5 w-5" />}
                  selected={paymentMethod === "AIRTEL_MONEY"}
                >
                  {paymentMethod === "AIRTEL_MONEY" && (
                    <div className="mt-3 rounded-lg bg-red-50 p-3">
                      <Label htmlFor="airtel-phone" className="text-xs">
                        Airtel phone number
                      </Label>
                      <Input
                        id="airtel-phone"
                        type="tel"
                        value={momoPhone}
                        onChange={(e) => setMomoPhone(e.target.value)}
                        placeholder="073XXXXXXX"
                        className="mt-1 h-9"
                      />
                    </div>
                  )}
                </PaymentOption>

                {/* Card */}
                <PaymentOption
                  value="CARD"
                  label={PAYMENT_METHODS.CARD.label}
                  description={PAYMENT_METHODS.CARD.description}
                  icon={<CreditCard className="h-5 w-5" />}
                  selected={paymentMethod === "CARD"}
                >
                  {paymentMethod === "CARD" && (
                    <div className="mt-3 rounded-lg bg-secondary/40 p-3 text-xs text-muted-foreground">
                      <p>You&apos;ll be redirected to Flutterwave&apos;s secure payment page to enter your card details.</p>
                      <p className="mt-1">🔒 3D Secure protected. We never see your card details.</p>
                    </div>
                  )}
                </PaymentOption>

                {/* COD (Kigali only) */}
                <PaymentOption
                  value="COD"
                  label={PAYMENT_METHODS.COD.label}
                  description={PAYMENT_METHODS.COD.description}
                  icon={<Banknote className="h-5 w-5" />}
                  disabled={!codAvailable}
                  disabledReason="Kigali only"
                  selected={paymentMethod === "COD"}
                >
                  {paymentMethod === "COD" && (
                    <div className="mt-3 rounded-lg bg-emerald-50 p-3">
                      <p className="text-sm text-emerald-800">
                        💵 Please have <strong>{formatRWF(total)}</strong> ready in cash for the delivery person.
                      </p>
                    </div>
                  )}
                </PaymentOption>

                {/* Bank Transfer */}
                <PaymentOption
                  value="BANK_TRANSFER"
                  label={PAYMENT_METHODS.BANK_TRANSFER.label}
                  description={PAYMENT_METHODS.BANK_TRANSFER.description}
                  icon={<Building2 className="h-5 w-5" />}
                  selected={paymentMethod === "BANK_TRANSFER"}
                >
                  {paymentMethod === "BANK_TRANSFER" && (
                    <div className="mt-3 space-y-2">
                      {BANK_ACCOUNTS.map((bank) => (
                        <div key={bank.accountNumber} className="rounded-lg bg-secondary/40 p-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-semibold">{bank.bank}</p>
                              <p className="text-xs text-muted-foreground">{bank.branch}</p>
                              <p className="mt-1 text-xs">Account: {bank.accountName}</p>
                              <p className="font-mono text-sm font-bold">{bank.accountNumber}</p>
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard?.writeText(bank.accountNumber)
                                toast({ title: "Account number copied!" })
                              }}
                              className="rounded p-1.5 text-muted-foreground hover:bg-background"
                              aria-label="Copy account number"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground">
                        💡 Order ships after we confirm your transfer. Call +250 788 123 456.
                      </p>
                    </div>
                  )}
                </PaymentOption>
              </RadioGroup>

              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
                </Button>
                <Button size="lg" className="flex-1" onClick={() => setStep(3)}>
                  Review order <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </section>
          )}

          {/* ─── STEP 3: REVIEW + PLACE ORDER ────────────────────── */}
          {step === 3 && (
            <section className="space-y-4">
              {/* Delivery review */}
              <div className="rounded-2xl border bg-card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Delivery to
                    </h3>
                    <p className="mt-1 font-medium">{form.customerName}</p>
                    <p className="text-sm text-muted-foreground">{form.customerPhone}</p>
                    <p className="mt-1 text-sm">
                      {form.cell && `${form.cell}, `}
                      {form.sector}, {form.district}
                    </p>
                    <p className="text-xs text-muted-foreground">{province}</p>
                    {form.landmark && (
                      <p className="mt-1 text-xs italic">📍 {form.landmark}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep(1)}>Edit</Button>
                </div>
              </div>

              {/* Payment review */}
              <div className="rounded-2xl border bg-card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Payment method
                    </h3>
                    <p className="mt-1 font-medium">
                      {PAYMENT_METHODS[paymentMethod].label}
                    </p>
                    {paymentMethod === "MTN_MOMO" || paymentMethod === "AIRTEL_MONEY" ? (
                      <p className="text-sm text-muted-foreground">{momoPhone}</p>
                    ) : null}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep(2)}>Edit</Button>
                </div>
              </div>

              {/* Items review */}
              <div className="rounded-2xl border bg-card p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Items ({items.length})
                </h3>
                <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto ub-scroll pr-1">
                  {items.map((item) => (
                    <li key={item.productId} className="flex gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-secondary/30">
                        {item.image && (
                          <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                        )}
                        <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="line-clamp-1 text-xs font-medium sm:text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatRWF(item.price)} × {item.quantity}
                        </p>
                      </div>
                      <p className="text-sm font-semibold">{formatRWF(item.price * item.quantity)}</p>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Payment status overlay */}
              {paymentStatus !== "idle" && (
                <div className="rounded-2xl border bg-card p-6 text-center">
                  <div className="mx-auto mb-4">
                    {paymentStatus === "initiating" && (
                      <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                    )}
                    {paymentStatus === "polling" && (
                      <div className="relative mx-auto h-12 w-12">
                        <Clock className="h-12 w-12 text-primary" />
                        <Loader2 className="absolute inset-0 h-12 w-12 animate-spin text-primary/50" />
                      </div>
                    )}
                    {paymentStatus === "paid" && (
                      <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
                    )}
                    {paymentStatus === "failed" && (
                      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-destructive">
                        ✕
                      </div>
                    )}
                  </div>
                  <p className="font-medium">{paymentMessage}</p>
                  {paymentStatus === "polling" && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Approve the prompt on your phone ({momoPhone}). This may take up to 60 seconds.
                    </p>
                  )}
                  {paymentStatus === "failed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setPaymentStatus("idle")}
                    >
                      Try again
                    </Button>
                  )}
                </div>
              )}

              {/* Actions */}
              {paymentStatus === "idle" && (
                <div className="flex gap-2">
                  <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep(2)}>
                    <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1"
                    onClick={handlePlaceOrder}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      `Place order · ${formatRWF(total)}`
                    )}
                  </Button>
                </div>
              )}

              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Your information is encrypted and secure.
              </p>
            </section>
          )}
        </div>

        {/* ─── Right: Order summary (sticky) ────────────────────── */}
        <aside className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Order summary</h2>

            <ul className="mt-4 max-h-48 space-y-2 overflow-y-auto ub-scroll pr-1">
              {items.map((item) => (
                <li key={item.productId} className="flex gap-2 text-sm">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-secondary/30">
                    {item.image && (
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    )}
                    <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="line-clamp-2 text-xs font-medium leading-snug">{item.name}</p>
                  </div>
                  <p className="text-sm font-semibold">{formatRWF(item.price * item.quantity)}</p>
                </li>
              ))}
            </ul>

            <div className="mt-4 space-y-2 border-t pt-4 text-sm">
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
                  <span>Loyalty ({redeemPoints} pts)</span>
                  <span>−{formatRWF(loyaltyDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery</span>
                {freeShipping ? (
                  <span className="text-emerald-600">FREE</span>
                ) : (
                  <span>{formatRWF(deliveryFee)}</span>
                )}
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

// ─── Payment option wrapper ─────────────────────────────────────────
function PaymentOption({
  value,
  label,
  description,
  icon,
  badge,
  disabled,
  disabledReason,
  selected,
  children,
}: {
  value: string
  label: string
  description: string
  icon: React.ReactNode
  badge?: string
  disabled?: boolean
  disabledReason?: string
  selected: boolean
  children?: React.ReactNode
}) {
  return (
    <label
      htmlFor={`pay-${value}`}
      className={`block rounded-xl border-2 p-4 transition-colors ${
        disabled
          ? "cursor-not-allowed border-border opacity-60"
          : selected
          ? "cursor-pointer border-primary bg-secondary/40"
          : "cursor-pointer border-border hover:border-primary/40"
      }`}
    >
      <div className="flex items-start gap-3">
        <RadioGroupItem value={value} id={`pay-${value}`} className="mt-1" disabled={disabled} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-primary">{icon}</span>
            <span className="font-medium">{label}</span>
            {badge && (
              <Badge className="bg-primary text-primary-foreground text-[10px]">{badge}</Badge>
            )}
            {disabled && disabledReason && (
              <Badge variant="secondary" className="text-[10px]">{disabledReason}</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </label>
  )
}
