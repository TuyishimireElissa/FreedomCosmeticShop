"use client"

/**
 * Checkout view — guest checkout flow.
 *
 * Form sections:
 *  1. Contact info: name, phone (required), email (optional)
 *  2. Delivery address: address, city, province (select), notes (optional)
 *  3. Payment method: MTN MoMo or Cash on Delivery
 *  4. Order summary: items + subtotal + delivery + total
 *
 * On submit:
 *  - Validates form
 *  - POSTs to /api/orders
 *  - On success: clears cart, navigates to confirmation view with order ID
 *  - On error: shows inline error message
 *
 * Notes on payment:
 *  - For MTN MoMo: this MVP *simulates* the MoMo prompt (no real API call).
 *    In production, integrate PayPack or Flutterwave to initiate the payment
 *    and update paymentStatus to PAID via webhook.
 *  - For COD: paymentStatus stays PENDING; payment collected at delivery.
 */

import { useState } from "react"
import { useStore } from "@/store/useStore"
import {
  formatRWF,
  RWANDAN_PROVINCES,
  deliveryFeeFor,
  PAYMENT_METHODS,
  PaymentMethodKey,
} from "@/lib/format"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Loader2, Smartphone, Banknote, ShieldCheck } from "lucide-react"

interface FormErrors {
  [key: string]: string
}

export function CheckoutView() {
  const { items, cartSubtotal, goCart, goCatalog, goConfirmation, clearCart } = useStore()
  const { toast } = useToast()

  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    address: "",
    city: "",
    province: "Kigali City",
    notes: "",
    paymentMethod: "MTN_MOMO" as PaymentMethodKey,
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const subtotal = cartSubtotal()
  const deliveryFee = items.length > 0 ? deliveryFeeFor(form.province) : 0
  const total = subtotal + deliveryFee

  const setField = (field: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [field]: value }))
    // Clear error when user edits
    if (errors[field]) {
      setErrors((e) => {
        const next = { ...e }
        delete next[field]
        return next
      })
    }
  }

  const validate = (): boolean => {
    const e: FormErrors = {}
    if (form.customerName.trim().length < 2) {
      e.customerName = "Please enter your full name"
    }
    // Rwandan phone numbers: 10 digits starting with 0, or +250 followed by 9 digits
    const phone = form.customerPhone.replace(/[\s-]/g, "")
    if (!/^(?:\+250|0)?7[0-9]{8}$/.test(phone)) {
      e.customerPhone = "Enter a valid Rwandan phone (e.g. 0788 123 456)"
    }
    if (form.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail)) {
      e.customerEmail = "Enter a valid email or leave blank"
    }
    if (form.address.trim().length < 5) {
      e.address = "Please enter your full address"
    }
    if (form.city.trim().length < 2) {
      e.city = "Please enter your city or sector"
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) {
      toast({
        title: "Please check the form",
        description: "Some fields need your attention.",
        variant: "destructive",
      })
      return
    }
    if (items.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Add products before checking out.",
        variant: "destructive",
      })
      goCatalog(null)
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        customerEmail: form.customerEmail.trim() || undefined,
        address: form.address.trim(),
        city: form.city.trim(),
        province: form.province,
        notes: form.notes.trim() || undefined,
        paymentMethod: form.paymentMethod,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
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
      const orderId = data.order?.id
      if (!orderId) throw new Error("Order ID missing in response")

      // Simulate MTN MoMo prompt (MVP — replace with real PayPack integration)
      if (form.paymentMethod === "MTN_MOMO") {
        toast({
          title: "MTN MoMo prompt sent",
          description: `Approve the prompt on ${form.customerPhone} (simulated for demo).`,
        })
        await new Promise((r) => setTimeout(r, 800))
      }

      clearCart()
      goConfirmation(orderId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to place order"
      toast({
        title: "Order failed",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Empty cart guard
  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <p className="text-muted-foreground mt-2">Add some products before checking out.</p>
        <Button className="mt-6" onClick={() => goCatalog(null)}>
          Browse products
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Checkout</h1>
        <Button variant="ghost" size="sm" onClick={goCart}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to cart
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        {/* Left: form sections */}
        <div className="space-y-6 lg:col-span-2">
          {/* Contact */}
          <section className="bg-card rounded-2xl border p-5">
            <h2 className="text-lg font-semibold">Contact information</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              We&apos;ll use this to update you about your delivery.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="customerName">
                  Full name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="customerName"
                  value={form.customerName}
                  onChange={(e) => setField("customerName", e.target.value)}
                  placeholder="e.g. Aline Mugisha"
                  className={errors.customerName ? "border-destructive" : ""}
                  autoComplete="name"
                  required
                />
                {errors.customerName && (
                  <p className="text-destructive mt-1 text-xs">{errors.customerName}</p>
                )}
              </div>
              <div>
                <Label htmlFor="customerPhone">
                  Phone number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="customerPhone"
                  value={form.customerPhone}
                  onChange={(e) => setField("customerPhone", e.target.value)}
                  placeholder="0788 123 456"
                  className={errors.customerPhone ? "border-destructive" : ""}
                  autoComplete="tel"
                  required
                />
                {errors.customerPhone && (
                  <p className="text-destructive mt-1 text-xs">{errors.customerPhone}</p>
                )}
              </div>
              <div>
                <Label htmlFor="customerEmail">Email (optional)</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={form.customerEmail}
                  onChange={(e) => setField("customerEmail", e.target.value)}
                  placeholder="you@example.com"
                  className={errors.customerEmail ? "border-destructive" : ""}
                  autoComplete="email"
                />
                {errors.customerEmail && (
                  <p className="text-destructive mt-1 text-xs">{errors.customerEmail}</p>
                )}
              </div>
            </div>
          </section>

          {/* Delivery */}
          <section className="bg-card rounded-2xl border p-5">
            <h2 className="text-lg font-semibold">Delivery address</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Where should we deliver your order?
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="address">
                  Street address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => setField("address", e.target.value)}
                  placeholder="e.g. KN 4 Ave, Kigali Heights, Apt 12"
                  className={errors.address ? "border-destructive" : ""}
                  required
                />
                {errors.address && (
                  <p className="text-destructive mt-1 text-xs">{errors.address}</p>
                )}
              </div>
              <div>
                <Label htmlFor="city">
                  City / Sector <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setField("city", e.target.value)}
                  placeholder="e.g. Nyarugenge"
                  className={errors.city ? "border-destructive" : ""}
                  required
                />
                {errors.city && <p className="text-destructive mt-1 text-xs">{errors.city}</p>}
              </div>
              <div>
                <Label htmlFor="province">Province</Label>
                <Select value={form.province} onValueChange={(v) => setField("province", v)}>
                  <SelectTrigger id="province">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RWANDAN_PROVINCES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="notes">Delivery notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  placeholder="e.g. Call when you arrive at the gate"
                  rows={3}
                  maxLength={500}
                />
              </div>
            </div>
          </section>

          {/* Payment */}
          <section className="bg-card rounded-2xl border p-5">
            <h2 className="text-lg font-semibold">Payment method</h2>
            <p className="text-muted-foreground mt-1 text-sm">Choose how you want to pay.</p>
            <RadioGroup
              value={form.paymentMethod}
              onValueChange={(v) => setField("paymentMethod", v)}
              className="mt-4 grid gap-3"
            >
              {(Object.keys(PAYMENT_METHODS) as PaymentMethodKey[]).map((key) => {
                const method = PAYMENT_METHODS[key]
                return (
                  <label
                    key={key}
                    htmlFor={`pay-${key}`}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors ${
                      form.paymentMethod === key
                        ? "border-primary bg-secondary/40"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <RadioGroupItem value={key} id={`pay-${key}`} className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {key === "MTN_MOMO" ? (
                          <Smartphone className="text-primary h-5 w-5" />
                        ) : (
                          <Banknote className="text-primary h-5 w-5" />
                        )}
                        <span className="font-medium">{method.label}</span>
                      </div>
                      <p className="text-muted-foreground mt-1 text-sm">{method.description}</p>
                      {key === "MTN_MOMO" && (
                        <p className="mt-2 text-xs text-amber-600">
                          For this demo, no real money will be charged. In production this triggers
                          a real MTN MoMo prompt.
                        </p>
                      )}
                    </div>
                  </label>
                )
              })}
            </RadioGroup>
          </section>
        </div>

        {/* Right: order summary */}
        <aside className="lg:col-span-1">
          <div className="bg-card sticky top-24 rounded-2xl border p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Order summary</h2>

            {/* Items */}
            <ul className="ub-scroll mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
              {items.map((item) => (
                <li key={item.productId} className="flex gap-3">
                  <div className="bg-secondary/30 relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-muted-foreground grid h-full w-full place-items-center text-xs">
                        —
                      </div>
                    )}
                    <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full text-[10px] font-semibold">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="line-clamp-2 text-xs leading-snug font-medium sm:text-sm">
                      {item.name}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
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
                <span className="font-medium">{formatRWF(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery fee</span>
                <span className="font-medium">{formatRWF(deliveryFee)}</span>
              </div>
              <div className="flex items-baseline justify-between border-t pt-2">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold">{formatRWF(total)}</span>
              </div>
            </div>

            <Button type="submit" size="lg" className="mt-5 w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Placing order...
                </>
              ) : (
                <>Place order • {formatRWF(total)}</>
              )}
            </Button>

            <div className="text-muted-foreground mt-4 flex items-center justify-center gap-2 text-xs">
              <ShieldCheck className="text-primary h-4 w-4" />
              Your information is encrypted and secure.
            </div>
          </div>
        </aside>
      </form>
    </div>
  )
}
