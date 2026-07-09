"use client"

/**
 * WholesaleView — complete wholesale program experience.
 *
 * Section 5: Wholesale Application Flow
 *
 * Internal views:
 *   - "landing"  → Hero, benefits, who can apply, price examples, how it works, FAQ
 *   - "apply"    → Multi-step application form (business → owner → documents)
 *   - "status"   → Application status (pending/approved/rejected)
 *   - "success"  → Post-submission confirmation
 *
 * Uses /api/wholesale/* endpoints from Section 2.
 */

import { useState, useEffect, useCallback } from "react"
import { useStore } from "@/store/useStore"
import { formatRWF } from "@/lib/format"
import { RWANDA_DISTRICTS, RWANDA_PROVINCES } from "@/lib/rwanda-locations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Store,
  TrendingDown,
  Truck,
  FileText,
  CreditCard,
  Package,
  Trophy,
  Sparkles,
  Loader2,
  Phone,
  Mail,
  XCircle,
} from "lucide-react"
import { WholesaleDashboard } from "./WholesaleDashboard"
import { WholesaleInvoices } from "./WholesaleInvoices"

type InternalView = "landing" | "apply" | "status" | "success" | "dashboard" | "invoices"

const BUSINESS_TYPES = [
  { value: "BEAUTY_SALON", label: "💇 Beauty Salon" },
  { value: "HAIR_SALON", label: "✂️ Hair Salon" },
  { value: "SPA", label: "🧖 Spa & Wellness" },
  { value: "SHOP", label: "🏪 Shop / Kiosk" },
  { value: "MARKET_VENDOR", label: "🛒 Market Vendor" },
  { value: "BEAUTY_SCHOOL", label: "🎓 Beauty School" },
  { value: "HOTEL", label: "🏨 Hotel / Lodge" },
  { value: "RESELLER", label: "📦 Reseller" },
  { value: "OTHER", label: "📋 Other" },
]

const REVENUE_RANGES = [
  "Less than 100,000 RWF",
  "100,000 - 500,000 RWF",
  "500,000 - 1,000,000 RWF",
  "1,000,000 - 5,000,000 RWF",
  "Over 5,000,000 RWF",
]

const HEARD_FROM_OPTIONS = [
  "Instagram", "Facebook", "WhatsApp", "Friend/Colleague",
  "Walk-in store", "Radio", "Event", "Other",
]

// ============================================================================
// Main component
// ============================================================================

export function WholesaleView() {
  const { user, goHome, goCatalog } = useStore()
  const [view, setView] = useState<InternalView>("landing")

  // Check if user already has a wholesale application on mount
  useEffect(() => {
    if (user) {
      fetch("/api/wholesale/application/status")
        .then((r) => r.json())
        .then((data) => {
          if (data.hasApplication && data.status === "PENDING") {
            setView("status")
          }
        })
        .catch(() => {})
    }
  }, [user])

  return (
    <div className="min-h-screen bg-background">
      {/* Back button */}
      <div className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            onClick={goHome}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to store
          </button>
        </div>
      </div>

      {view === "landing" && <WholesaleLanding onApply={() => setView("apply")} onCheckStatus={() => setView("status")} onDashboard={() => setView("dashboard")} />}
      {view === "apply" && <WholesaleApplicationForm onSuccess={() => setView("success")} onBack={() => setView("landing")} />}
      {view === "status" && <WholesaleStatusPage onApply={() => setView("apply")} />}
      {view === "success" && <WholesaleSuccessPage onCheckStatus={() => setView("status")} onContinue={() => goCatalog()} />}
      {view === "dashboard" && <WholesaleDashboard onInvoices={() => setView("invoices")} onCatalog={() => goCatalog()} />}
      {view === "invoices" && <WholesaleInvoices onBack={() => setView("dashboard")} />}
    </div>
  )
}

// ============================================================================
// Landing Page
// ============================================================================

function WholesaleLanding({ onApply, onCheckStatus, onDashboard }: { onApply: () => void; onCheckStatus: () => void; onDashboard: () => void }) {
  const { user } = useStore()

  const isApproved = user?.wholesaleStatus === "APPROVED"

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-primary/80 px-4 py-16 text-primary-foreground sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-5xl">🏪</p>
          <h1 className="mt-4 text-3xl font-bold sm:text-5xl">
            FreedomCosmeticShop Wholesale Program
          </h1>
          <p className="mt-3 text-lg text-primary-foreground/90">
            Rwanda's Premier Beauty Wholesale Supplier
          </p>
          <p className="mt-2 text-sm text-primary-foreground/80">
            Up to 30% off retail prices · For salons, shops & resellers across all 30 districts
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {isApproved ? (
              <Button size="lg" variant="secondary" onClick={onDashboard}>
                🏪 Go to Wholesale Dashboard →
              </Button>
            ) : (
              <Button size="lg" variant="secondary" onClick={onApply}>
                Apply Now — It's Free →
              </Button>
            )}
            {user && !isApproved && (
              <Button size="lg" variant="outline" onClick={onCheckStatus} className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                Check Application Status
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold">Why Join Wholesale?</h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: TrendingDown, title: "Up to 30% Discount", desc: "Save on every product when you buy in bulk. The more you buy, the more you save." },
              { icon: Truck, title: "Priority Bulk Delivery", desc: "Fast delivery across all 30 districts of Rwanda. Priority handling for wholesale orders." },
              { icon: FileText, title: "Professional Invoices", desc: "TIN-compliant invoices with your business details. Perfect for accounting and tax purposes." },
              { icon: CreditCard, title: "Credit Payment Available", desc: "Buy now, pay later with 30-day credit terms. Credit limit based on your business size." },
              { icon: Package, title: "Bulk Order Support", desc: "Dedicated account manager for large orders. Special requests accommodated." },
              { icon: Trophy, title: "Loyalty Rewards", desc: "Earn points on every wholesale order. Redeem for discounts and free products." },
            ].map((b) => (
              <div key={b.title} className="rounded-2xl border bg-card p-5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10">
                  <b.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-3 font-semibold">{b.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who Can Apply */}
      <section className="bg-secondary/30 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold">Who Can Apply?</h2>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Wholesale is available for registered businesses across Rwanda
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {BUSINESS_TYPES.map((bt) => (
              <div key={bt.value} className="rounded-xl border bg-card p-4 text-center">
                <p className="text-2xl">{bt.label.split(" ")[0]}</p>
                <p className="mt-1 text-xs font-medium">{bt.label.split(" ").slice(1).join(" ")}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Price Example Table */}
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold">Example: Wholesale Pricing</h2>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Sample product — actual discounts vary per product
          </p>
          <div className="mt-6 overflow-hidden rounded-2xl border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/30">
                <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-left font-medium">Quantity</th>
                  <th className="px-4 py-3 text-right font-medium">Unit Price</th>
                  <th className="px-4 py-3 text-right font-medium">Total Savings</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  { qty: "1 - 5 units", price: 8500, savings: "—" },
                  { qty: "6 - 11 units", price: 7500, savings: "Up to 10,000 RWF" },
                  { qty: "12 - 23 units", price: 7000, savings: "Up to 34,000 RWF" },
                  { qty: "24 - 47 units", price: 6500, savings: "Up to 96,000 RWF" },
                  { qty: "48+ units", price: 6000, savings: "Over 240,000 RWF" },
                ].map((row) => (
                  <tr key={row.qty} className="hover:bg-secondary/20">
                    <td className="px-4 py-3 font-medium">{row.qty}</td>
                    <td className="px-4 py-3 text-right font-bold">{formatRWF(row.price)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{row.savings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Minimum wholesale order: 50,000 RWF · Prices in Rwandan Francs
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-secondary/30 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold">How It Works</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-4">
            {[
              { step: 1, title: "Apply Online", desc: "Fill out the application form in 5 minutes" },
              { step: 2, title: "We Review", desc: "We review your application within 24-48 hours" },
              { step: 3, title: "Get Approved", desc: "Access wholesale prices + credit terms" },
              { step: 4, title: "Order & Save!", desc: "Place bulk orders and save up to 30%" },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {s.step}
                </div>
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-2xl font-bold">Frequently Asked Questions</h2>
          <div className="mt-6 space-y-3">
            {[
              { q: "What is the minimum wholesale order?", a: "The minimum wholesale order is 50,000 RWF. Orders below this amount will be processed as retail orders." },
              { q: "How long does approval take?", a: "We review applications within 24-48 business hours. You'll receive an SMS notification when your application is reviewed." },
              { q: "What documents do I need?", a: "Business registration and TIN certificate are helpful but not required. You can apply with just your business details and National ID." },
              { q: "Is credit payment available?", a: "Yes! Approved wholesale customers can pay on credit with 30-day terms. Credit limit is set based on your business size and history." },
              { q: "Can I order from provinces?", a: "Absolutely! We deliver to all 30 districts of Rwanda. Delivery fees vary by province — Kigali is 1,000 RWF, provinces range from 3,000-4,000 RWF." },
            ].map((faq) => (
              <details key={faq.q} className="rounded-xl border bg-card p-4">
                <summary className="cursor-pointer text-sm font-medium">{faq.q}</summary>
                <p className="mt-2 text-sm text-muted-foreground">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary px-4 py-12 text-center text-primary-foreground sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold">Ready to save up to 30%?</h2>
        <p className="mt-2 text-sm text-primary-foreground/90">
          Join 100+ Rwandan businesses already saving with FreedomCosmeticShop Wholesale
        </p>
        <Button size="lg" variant="secondary" className="mt-6" onClick={onApply}>
          Apply for Wholesale Account →
        </Button>
      </section>
    </div>
  )
}

// ============================================================================
// Multi-Step Application Form
// ============================================================================

function WholesaleApplicationForm({ onSuccess, onBack }: { onSuccess: () => void; onBack: () => void }) {
  const { user, goLogin } = useStore()
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  // Step 1: Business Info
  const [businessName, setBusinessName] = useState("")
  const [businessType, setBusinessType] = useState("BEAUTY_SALON")
  const [businessPhone, setBusinessPhone] = useState(user?.phone || "")
  const [businessDistrict, setBusinessDistrict] = useState("")
  const [businessAddress, setBusinessAddress] = useState("")
  const [yearsInBusiness, setYearsInBusiness] = useState("1")
  const [tinNumber, setTinNumber] = useState("")

  // Step 2: Owner Info
  const [ownerName, setOwnerName] = useState(user?.name || "")
  const [ownerPhone, setOwnerPhone] = useState(user?.phone || "")
  const [ownerEmail, setOwnerEmail] = useState(user?.email || "")
  const [nationalId, setNationalId] = useState("")
  const [monthlyRevenue, setMonthlyRevenue] = useState(REVENUE_RANGES[0])
  const [heardFrom, setHeardFrom] = useState(HEARD_FROM_OPTIONS[0])

  // Step 3: Documents & Notes
  const [notes, setNotes] = useState("")
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [confirmAccurate, setConfirmAccurate] = useState(false)

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Login Required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Please log in or register to apply for a wholesale account.
        </p>
        <Button className="mt-6" onClick={goLogin}>
          Go to Login
        </Button>
      </div>
    )
  }

  const validateStep1 = () => {
    if (!businessName.trim()) return "Business name is required"
    if (!businessPhone.trim()) return "Business phone is required"
    if (!businessDistrict) return "Business district is required"
    if (!businessAddress.trim()) return "Business address is required"
    return null
  }

  const validateStep2 = () => {
    if (!ownerName.trim()) return "Owner name is required"
    if (!ownerPhone.trim()) return "Owner phone is required"
    if (!nationalId.trim()) return "National ID is required"
    return null
  }

  const handleNext = () => {
    const error = step === 1 ? validateStep1() : step === 2 ? validateStep2() : null
    if (error) {
      toast({ title: "Please fix errors", description: error, variant: "destructive" })
      return
    }
    setStep(step + 1)
  }

  const handleSubmit = async () => {
    if (!agreeTerms || !confirmAccurate) {
      toast({ title: "Please accept the terms", description: "You must agree to the wholesale terms and confirm your information is accurate.", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/wholesale/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          businessType,
          businessPhone,
          businessAddress,
          businessDistrict,
          tinNumber: tinNumber || undefined,
          yearsInBusiness: Number(yearsInBusiness),
          monthlyRevenue,
          nationalId,
          heardFrom,
          notes: notes || undefined,
          documents: [],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Submission failed")

      onSuccess()
    } catch (e) {
      toast({
        title: "Submission failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const allDistricts = RWANDA_PROVINCES.flatMap((p) => RWANDA_DISTRICTS[p])

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {/* Progress bar */}
      <div className="mb-8 flex items-center justify-between">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex flex-1 items-center">
            <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${
              s <= step ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}>
              {s < step ? <CheckCircle2 className="h-4 w-4" /> : s}
            </div>
            {s < 3 && (
              <div className={`h-0.5 flex-1 ${s < step ? "bg-primary" : "bg-secondary"}`} />
            )}
          </div>
        ))}
      </div>

      <p className="mb-6 text-center text-sm text-muted-foreground">
        Step {step} of 3: {step === 1 ? "Business Details" : step === 2 ? "Owner Details" : "Documents & Submit"}
      </p>

      {/* Step 1: Business Information */}
      {step === 1 && (
        <div className="space-y-4 rounded-2xl border bg-card p-6">
          <div>
            <Label htmlFor="biz-name">Business Name *</Label>
            <Input id="biz-name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Amina Beauty Salon" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="biz-type">Business Type *</Label>
            <Select value={businessType} onValueChange={setBusinessType}>
              <SelectTrigger id="biz-type" className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {BUSINESS_TYPES.map((bt) => (
                  <SelectItem key={bt.value} value={bt.value}>{bt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="biz-phone">Business Phone *</Label>
            <Input id="biz-phone" value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} placeholder="+250 780 000 001" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="biz-district">Business District *</Label>
            <Select value={businessDistrict} onValueChange={setBusinessDistrict}>
              <SelectTrigger id="biz-district" className="mt-1"><SelectValue placeholder="Select district" /></SelectTrigger>
              <SelectContent>
                {allDistricts.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="biz-address">Business Address *</Label>
            <Input id="biz-address" value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} placeholder="KG 123 St, near KCT Building" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="years">Years in Business</Label>
              <Select value={yearsInBusiness} onValueChange={setYearsInBusiness}>
                <SelectTrigger id="years" className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 5, 10, 20].map((y) => (
                    <SelectItem key={y} value={String(y)}>{y} year{y > 1 ? "s" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="tin">TIN Number (optional)</Label>
              <Input id="tin" value={tinNumber} onChange={(e) => setTinNumber(e.target.value)} placeholder="123456789" className="mt-1" />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleNext}>Next Step →</Button>
          </div>
        </div>
      )}

      {/* Step 2: Owner Information */}
      {step === 2 && (
        <div className="space-y-4 rounded-2xl border bg-card p-6">
          <div>
            <Label htmlFor="owner-name">Owner Full Name *</Label>
            <Input id="owner-name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Amina Uwase" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="owner-phone">Owner Phone *</Label>
            <Input id="owner-phone" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} placeholder="+250 780 000 001" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="owner-email">Owner Email (optional)</Label>
            <Input id="owner-email" type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="amina@gmail.com" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="national-id">National ID Number *</Label>
            <Input id="national-id" value={nationalId} onChange={(e) => setNationalId(e.target.value)} placeholder="1 1990 8 0000001 0 00" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="revenue">Estimated Monthly Order</Label>
            <Select value={monthlyRevenue} onValueChange={setMonthlyRevenue}>
              <SelectTrigger id="revenue" className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REVENUE_RANGES.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="heard">How did you hear about us?</Label>
            <Select value={heardFrom} onValueChange={setHeardFrom}>
              <SelectTrigger id="heard" className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {HEARD_FROM_OPTIONS.map((h) => (
                  <SelectItem key={h} value={h}>{h}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
            <Button onClick={handleNext}>Next Step →</Button>
          </div>
        </div>
      )}

      {/* Step 3: Documents & Submit */}
      {step === 3 && (
        <div className="space-y-4 rounded-2xl border bg-card p-6">
          <div className="rounded-lg border border-dashed p-4 text-center">
            <p className="text-sm font-medium">📎 Document Upload (optional)</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Business registration, TIN certificate, or other documents can help speed up approval.
              For now, you can submit without documents — we'll contact you if needed.
            </p>
          </div>
          <div>
            <Label htmlFor="notes">Additional Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="We supply 5 salons in Kimironko and need regular bulk deliveries..."
              rows={3}
              className="mt-1 resize-none"
              maxLength={1000}
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="mt-1 h-4 w-4 rounded" />
              <span>I agree to the wholesale terms and conditions, including minimum order requirements and payment terms.</span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={confirmAccurate} onChange={(e) => setConfirmAccurate(e.target.checked)} className="mt-1 h-4 w-4 rounded" />
              <span>I confirm that all information provided is accurate and complete.</span>
            </label>
          </div>
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(2)}>← Back</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
              ) : (
                <>Submit Application</>
              )}
            </Button>
          </div>
        </div>
      )}

      <button onClick={onBack} className="mt-6 w-full text-center text-xs text-muted-foreground hover:text-foreground">
        ← Back to Wholesale Info
      </button>
    </div>
  )
}

// ============================================================================
// Application Status Page
// ============================================================================

function WholesaleStatusPage({ onApply }: { onApply: () => void }) {
  const { user, goHome, goCatalog, goLogin } = useStore()
  const [application, setApplication] = useState<{
    hasApplication: boolean
    status: string | null
    application?: {
      id: string
      businessName: string
      appliedAt: string
      reviewedAt: string | null
      rejectionReason: string | null
      reviewNotes: string | null
    }
  } | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/wholesale/application/status")
      if (!res.ok) return
      const data = await res.json()
      setApplication(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) {
      load()
    } else {
      setLoading(false)
    }
  }, [user, load])

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Login Required</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please log in to check your application status.</p>
        <Button className="mt-6" onClick={goLogin}>Go to Login</Button>
      </div>
    )
  }

  if (!application || !application.hasApplication) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <Store className="mx-auto h-12 w-12 text-muted-foreground/40" />
        <h1 className="mt-4 text-xl font-bold">No Application Found</h1>
        <p className="mt-2 text-sm text-muted-foreground">You haven't applied for a wholesale account yet.</p>
        <Button className="mt-6" onClick={onApply}>Apply for Wholesale →</Button>
        <button onClick={goHome} className="mt-4 block w-full text-xs text-muted-foreground hover:text-foreground">
          ← Back to store
        </button>
      </div>
    )
  }

  const status = application.status

  // PENDING
  if (status === "PENDING") {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-2xl border bg-card p-8 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-amber-100">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-amber-900">Application Under Review</h1>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            Application ID: {application.application?.id?.slice(-8).toUpperCase()}
          </p>

          {/* Timeline */}
          <div className="mt-6 flex items-center justify-between">
            <div className="text-center">
              <div className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-emerald-500 text-white">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <p className="mt-1 text-[10px] font-medium">Submitted</p>
            </div>
            <div className="flex-1 border-t-2 border-amber-300"></div>
            <div className="text-center">
              <div className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-amber-400 text-white">
                <Clock className="h-4 w-4 animate-pulse" />
              </div>
              <p className="mt-1 text-[10px] font-medium">In Review</p>
            </div>
            <div className="flex-1 border-t-2 border-secondary"></div>
            <div className="text-center">
              <div className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-secondary text-muted-foreground">
                <Sparkles className="h-4 w-4" />
              </div>
              <p className="mt-1 text-[10px] font-medium">Decision</p>
            </div>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            Submitted: {new Date(application.application?.appliedAt || "").toLocaleDateString("en-RW", { day: "numeric", month: "long", year: "numeric" })}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Expected: Within 48 hours
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            We will SMS you at <span className="font-medium text-foreground">{user.phone}</span> when your application is reviewed.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Questions? WhatsApp: <a href="https://wa.me/250780000000" className="text-primary hover:underline">+250 780 000 000</a>
          </p>
        </div>
        <button onClick={goHome} className="mt-6 w-full text-center text-xs text-muted-foreground hover:text-foreground">
          ← Continue Shopping as Retail
        </button>
      </div>
    )
  }

  // APPROVED
  if (status === "APPROVED") {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500">
            <CheckCircle2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-emerald-900">Wholesale Account Approved! 🎉</h1>
          <p className="mt-1 text-sm text-emerald-700">
            Welcome to FreedomCosmeticShop Wholesale Program!
          </p>

          <div className="mt-6 space-y-2 text-left">
            <div className="flex items-center gap-2 rounded-lg bg-white p-2 text-sm">
              <TrendingDown className="h-4 w-4 text-emerald-600" />
              <span>Up to 30% discount on all products</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-white p-2 text-sm">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              <span>Credit payment available (30-day terms)</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-white p-2 text-sm">
              <FileText className="h-4 w-4 text-emerald-600" />
              <span>Professional invoices with TIN</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-white p-2 text-sm">
              <Truck className="h-4 w-4 text-emerald-600" />
              <span>Priority bulk delivery across Rwanda</span>
            </div>
          </div>

          <Button className="mt-6 w-full" size="lg" onClick={() => goCatalog()}>
            Start Shopping Wholesale →
          </Button>
        </div>
      </div>
    )
  }

  // REJECTED
  if (status === "REJECTED") {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-100">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-red-900">Application Not Approved</h1>
          <p className="mt-2 text-sm text-red-700">
            Unfortunately, your wholesale application was not approved at this time.
          </p>
          {application.application?.rejectionReason && (
            <div className="mt-4 rounded-lg border border-red-200 bg-white p-3 text-left">
              <p className="text-xs font-semibold text-red-800">Reason:</p>
              <p className="mt-1 text-sm text-red-700">{application.application.rejectionReason}</p>
            </div>
          )}
          <p className="mt-4 text-sm text-muted-foreground">
            You can still shop as a retail customer. For questions, call <a href="tel:+250780000000" className="text-primary hover:underline">+250 780 000 000</a>.
          </p>
          <div className="mt-6 space-y-2">
            <Button variant="outline" className="w-full" onClick={onApply}>
              Reapply (after 30 days)
            </Button>
            <Button className="w-full" onClick={() => goCatalog()}>
              Continue Shopping
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Unknown status
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="text-sm text-muted-foreground">Status: {status}</p>
      <Button className="mt-6" onClick={goHome}>Back to store</Button>
    </div>
  )
}

// ============================================================================
// Success Page (post-submission)
// ============================================================================

function WholesaleSuccessPage({ onCheckStatus, onContinue }: { onCheckStatus: () => void; onContinue: () => void }) {
  const { user } = useStore()
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500">
          <CheckCircle2 className="h-8 w-8 text-white" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-emerald-900">Application Submitted! 🎉</h1>
        <p className="mt-2 text-sm text-emerald-700">
          We will review your application within 24-48 business hours.
        </p>

        <div className="mt-6 rounded-lg bg-white p-4 text-left">
          <p className="text-xs font-semibold text-muted-foreground">We will contact you on:</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm">
            <Phone className="h-3.5 w-3.5 text-primary" /> {user?.phone}
          </p>
          {user?.email && (
            <p className="mt-1 flex items-center gap-1.5 text-sm">
              <Mail className="h-3.5 w-3.5 text-primary" /> {user.email}
            </p>
          )}
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          You will receive an SMS confirmation shortly. We'll also SMS you when your application is reviewed.
        </p>

        <div className="mt-6 space-y-2">
          <Button className="w-full" onClick={onCheckStatus}>
            Check Application Status
          </Button>
          <Button variant="outline" className="w-full" onClick={onContinue}>
            Continue Shopping as Retail
          </Button>
        </div>
      </div>
    </div>
  )
}
