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
import { useT } from '@/lib/i18n/LanguageContext'

type InternalView = "landing" | "apply" | "status" | "success" | "dashboard" | "invoices"

const BUSINESS_TYPES = [
  { value: "BEAUTY_SALON", label: "wholesale.business_beauty_salon" },
  { value: "HAIR_SALON", label: "wholesale.business_hair_salon" },
  { value: "SPA", label: "wholesale.business_spa" },
  { value: "SHOP", label: "wholesale.business_shop" },
  { value: "MARKET_VENDOR", label: "wholesale.business_market_vendor" },
  { value: "BEAUTY_SCHOOL", label: "wholesale.business_beauty_school" },
  { value: "HOTEL", label: "wholesale.business_hotel" },
  { value: "RESELLER", label: "wholesale.business_reseller" },
  { value: "OTHER", label: "wholesale.business_other" },
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
  const t = useT()
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
            <ArrowLeft className="h-4 w-4" /> {t('wholesale.back_store')}
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
  const t = useT()
  const { user } = useStore()

  const isApproved = user?.wholesaleStatus === "APPROVED"

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-primary/80 px-4 py-16 text-primary-foreground sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-5xl">🏪</p>
          <h1 className="mt-4 text-3xl font-bold sm:text-5xl">
            {t('wholesale.program_title')}
          </h1>
          <p className="mt-3 text-lg text-primary-foreground/90">
            {t('wholesale.premier_supplier')}
          </p>
          <p className="mt-2 text-sm text-primary-foreground/80">
            {t('wholesale.hero_subtitle')}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {isApproved ? (
              <Button size="lg" variant="secondary" onClick={onDashboard}>
                🏪 {t('wholesale.go_dashboard')} →
              </Button>
            ) : (
              <Button size="lg" variant="secondary" onClick={onApply}>
                {t('wholesale.apply_free')} →
              </Button>
            )}
            {user && !isApproved && (
              <Button size="lg" variant="outline" onClick={onCheckStatus} className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                {t('wholesale.check_status')}
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold">{t('wholesale.why_join')}</h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: TrendingDown, title: t('wholesale.discount_title'), desc: t('wholesale.discount_desc') },
              { icon: Truck, title: t('wholesale.priority_title'), desc: t('wholesale.priority_desc') },
              { icon: FileText, title: t('wholesale.invoices_title'), desc: t('wholesale.invoices_desc') },
              { icon: CreditCard, title: t('wholesale.credit_title'), desc: t('wholesale.credit_desc') },
              { icon: Package, title: t('wholesale.bulk_title'), desc: t('wholesale.bulk_desc') },
              { icon: Trophy, title: t('wholesale.loyalty_title'), desc: t('wholesale.loyalty_desc') },
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
          <h2 className="text-center text-2xl font-bold">{t('wholesale.who_apply')}</h2>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            {t('wholesale.registered_rwanda')}
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {BUSINESS_TYPES.map((bt) => (
              <div key={bt.value} className="rounded-xl border bg-card p-4 text-center">
                <p className="text-2xl">{t(bt.label).split(" ")[0]}</p>
                <p className="mt-1 text-xs font-medium">{t(bt.label).split(" ").slice(1).join(" ")}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Price Example Table */}
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold">{t('wholesale.pricing_example')}</h2>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            {t('wholesale.pricing_sample_hint')}
          </p>
          <div className="mt-6 overflow-hidden rounded-2xl border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/30">
                <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-left font-medium">{t('product.quantity_label')}</th>
                  <th className="px-4 py-3 text-right font-medium">{t('product.unit_price')}</th>
                  <th className="px-4 py-3 text-right font-medium">{t('wholesale.total_savings')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  { qty: t('wholesale.qty_1_5'), price: 8500, savings: "—" },
                  { qty: t('wholesale.qty_6_11'), price: 7500, savings: t('wholesale.save_10000') },
                  { qty: t('wholesale.qty_12_23'), price: 7000, savings: t('wholesale.save_34000') },
                  { qty: t('wholesale.qty_24_47'), price: 6500, savings: t('wholesale.save_96000') },
                  { qty: t('wholesale.qty_48_plus'), price: 6000, savings: t('wholesale.over_240000') },
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
            {t('wholesale.minimum_pricing_note')}
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-secondary/30 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold">{t('wholesale.how_works')}</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-4">
            {[
              { step: 1, title: t('wholesale.apply_online'), desc: t('wholesale.apply_online_desc') },
              { step: 2, title: t('wholesale.we_review'), desc: t('wholesale.we_review_desc') },
              { step: 3, title: t('wholesale.get_approved'), desc: t('wholesale.get_approved_desc') },
              { step: 4, title: t('wholesale.order_save'), desc: t('wholesale.order_save_desc') },
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
          <h2 className="text-center text-2xl font-bold">{t('faq.title')}</h2>
          <div className="mt-6 space-y-3">
            {[
              { q: t('wholesale.faq_min_q'), a: t('wholesale.faq_min_a') },
              { q: t('wholesale.faq_approval_q'), a: t('wholesale.faq_approval_a') },
              { q: t('wholesale.faq_docs_q'), a: t('wholesale.faq_docs_a') },
              { q: t('wholesale.faq_credit_q'), a: t('wholesale.faq_credit_a') },
              { q: t('wholesale.faq_provinces_q'), a: t('wholesale.faq_provinces_a') },
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
        <h2 className="text-2xl font-bold">{t('wholesale.ready_save')}</h2>
        <p className="mt-2 text-sm text-primary-foreground/90">
          {t('wholesale.join_businesses')}
        </p>
        <Button size="lg" variant="secondary" className="mt-6" onClick={onApply}>
          {t('home.apply_wholesale_account')} →
        </Button>
      </section>
    </div>
  )
}

// ============================================================================
// Multi-Step Application Form
// ============================================================================

function WholesaleApplicationForm({ onSuccess, onBack }: { onSuccess: () => void; onBack: () => void }) {
  const t = useT()
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
        <h1 className="text-2xl font-bold">{t('wholesale.login_required')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('wholesale.login_apply_hint')}
        </p>
        <Button className="mt-6" onClick={goLogin}>
          {t('auth.go_login')}
        </Button>
      </div>
    )
  }

  const validateStep1 = () => {
    if (!businessName.trim()) return t('wholesale.business_name_required')
    if (!businessPhone.trim()) return t('wholesale.business_phone_required')
    if (!businessDistrict) return t('wholesale.business_district_required')
    if (!businessAddress.trim()) return t('wholesale.business_address_required')
    return null
  }

  const validateStep2 = () => {
    if (!ownerName.trim()) return t('wholesale.owner_name_required')
    if (!ownerPhone.trim()) return t('wholesale.owner_phone_required')
    if (!nationalId.trim()) return t('wholesale.national_id_required')
    return null
  }

  const handleNext = () => {
    const error = step === 1 ? validateStep1() : step === 2 ? validateStep2() : null
    if (error) {
      toast({ title: t('wholesale.fix_errors'), description: error, variant: "destructive" })
      return
    }
    setStep(step + 1)
  }

  const handleSubmit = async () => {
    if (!agreeTerms || !confirmAccurate) {
      toast({ title: t('wholesale.accept_terms'), description: t('wholesale.accept_terms_hint'), variant: "destructive" })
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
      if (!res.ok) throw new Error(data.error || t('wholesale.submission_failed'))

      onSuccess()
    } catch (e) {
      toast({
        title: t('wholesale.submission_failed'),
        description: e instanceof Error ? e.message : t('common.error'),
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
        {t('wholesale.step_of', { step })}: {step === 1 ? t('wholesale.business_details') : step === 2 ? t('wholesale.owner_details') : t('wholesale.documents_submit')}
      </p>

      {/* Step 1: Business Information */}
      {step === 1 && (
        <div className="space-y-4 rounded-2xl border bg-card p-6">
          <div>
            <Label htmlFor="biz-name">{t('wholesale.business_name')}</Label>
            <Input id="biz-name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Amina Beauty Salon" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="biz-type">{t('wholesale.business_type')}</Label>
            <Select value={businessType} onValueChange={setBusinessType}>
              <SelectTrigger id="biz-type" className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {BUSINESS_TYPES.map((bt) => (
                  <SelectItem key={bt.value} value={bt.value}>{t(bt.label)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="biz-phone">{t('wholesale.business_phone')}</Label>
            <Input id="biz-phone" value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} placeholder="+250 780 000 001" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="biz-district">{t('wholesale.business_district')}</Label>
            <Select value={businessDistrict} onValueChange={setBusinessDistrict}>
              <SelectTrigger id="biz-district" className="mt-1"><SelectValue placeholder={t('checkout.district_select')} /></SelectTrigger>
              <SelectContent>
                {allDistricts.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="biz-address">{t('wholesale.business_address')}</Label>
            <Input id="biz-address" value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} placeholder="KG 123 St, near KCT Building" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="years">{t('wholesale.years_business')}</Label>
              <Select value={yearsInBusiness} onValueChange={setYearsInBusiness}>
                <SelectTrigger id="years" className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 5, 10, 20].map((y) => (
                    <SelectItem key={y} value={String(y)}>{t('wholesale.years_count', { count: y })}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="tin">{t('wholesale.tin_optional')}</Label>
              <Input id="tin" value={tinNumber} onChange={(e) => setTinNumber(e.target.value)} placeholder="123456789" className="mt-1" />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleNext}>{t('wholesale.next_step')} →</Button>
          </div>
        </div>
      )}

      {/* Step 2: Owner Information */}
      {step === 2 && (
        <div className="space-y-4 rounded-2xl border bg-card p-6">
          <div>
            <Label htmlFor="owner-name">{t('wholesale.owner_full_name')}</Label>
            <Input id="owner-name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Amina Uwase" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="owner-phone">{t('wholesale.owner_phone')}</Label>
            <Input id="owner-phone" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} placeholder="+250 780 000 001" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="owner-email">{t('wholesale.owner_email_optional')}</Label>
            <Input id="owner-email" type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="amina@gmail.com" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="national-id">{t('wholesale.national_id')}</Label>
            <Input id="national-id" value={nationalId} onChange={(e) => setNationalId(e.target.value)} placeholder="1 1990 8 0000001 0 00" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="revenue">{t('wholesale.monthly_order')}</Label>
            <Select value={monthlyRevenue} onValueChange={setMonthlyRevenue}>
              <SelectTrigger id="revenue" className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REVENUE_RANGES.map((r, index) => (
                  <SelectItem key={r} value={r}>{t(`wholesale.revenue_${index}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="heard">{t('wholesale.heard_about')}</Label>
            <Select value={heardFrom} onValueChange={setHeardFrom}>
              <SelectTrigger id="heard" className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {HEARD_FROM_OPTIONS.map((h, index) => (
                  <SelectItem key={h} value={h}>{t(`wholesale.heard_${index}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(1)}>← {t('common.back')}</Button>
            <Button onClick={handleNext}>{t('wholesale.next_step')} →</Button>
          </div>
        </div>
      )}

      {/* Step 3: Documents & Submit */}
      {step === 3 && (
        <div className="space-y-4 rounded-2xl border bg-card p-6">
          <div className="rounded-lg border border-dashed p-4 text-center">
            <p className="text-sm font-medium">📎 {t('wholesale.document_upload')}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('wholesale.documents_hint')}
            </p>
          </div>
          <div>
            <Label htmlFor="notes">{t('wholesale.additional_notes')}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('wholesale.notes_placeholder')}
              rows={3}
              className="mt-1 resize-none"
              maxLength={1000}
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="mt-1 h-4 w-4 rounded" />
              <span>{t('wholesale.agree_terms')}</span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={confirmAccurate} onChange={(e) => setConfirmAccurate(e.target.checked)} className="mt-1 h-4 w-4 rounded" />
              <span>{t('wholesale.confirm_accurate')}</span>
            </label>
          </div>
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(2)}>← {t('common.back')}</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('wholesale.submitting')}</>
              ) : (
                <>{t('wholesale.submit_application')}</>
              )}
            </Button>
          </div>
        </div>
      )}

      <button onClick={onBack} className="mt-6 w-full text-center text-xs text-muted-foreground hover:text-foreground">
        ← {t('wholesale.back_info')}
      </button>
    </div>
  )
}

// ============================================================================
// Application Status Page
// ============================================================================

function WholesaleStatusPage({ onApply }: { onApply: () => void }) {
  const t = useT()
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
        <h1 className="text-2xl font-bold">{t('wholesale.login_required')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('wholesale.login_status_hint')}</p>
        <Button className="mt-6" onClick={goLogin}>{t('auth.go_login')}</Button>
      </div>
    )
  }

  if (!application || !application.hasApplication) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <Store className="mx-auto h-12 w-12 text-muted-foreground/40" />
        <h1 className="mt-4 text-xl font-bold">{t('wholesale.no_application')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('wholesale.not_applied')}</p>
        <Button className="mt-6" onClick={onApply}>{t('home.apply_wholesale')} →</Button>
        <button onClick={goHome} className="mt-4 block w-full text-xs text-muted-foreground hover:text-foreground">
          ← {t('wholesale.back_store')}
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
          <h1 className="mt-4 text-xl font-bold text-amber-900">{t('wholesale.under_review')}</h1>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            {t('wholesale.application_id')}: {application.application?.id?.slice(-8).toUpperCase()}
          </p>

          {/* Timeline */}
          <div className="mt-6 flex items-center justify-between">
            <div className="text-center">
              <div className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-emerald-500 text-white">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <p className="mt-1 text-[10px] font-medium">{t('wholesale.submitted')}</p>
            </div>
            <div className="flex-1 border-t-2 border-amber-300"></div>
            <div className="text-center">
              <div className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-amber-400 text-white">
                <Clock className="h-4 w-4 animate-pulse" />
              </div>
              <p className="mt-1 text-[10px] font-medium">{t('wholesale.in_review')}</p>
            </div>
            <div className="flex-1 border-t-2 border-secondary"></div>
            <div className="text-center">
              <div className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-secondary text-muted-foreground">
                <Sparkles className="h-4 w-4" />
              </div>
              <p className="mt-1 text-[10px] font-medium">{t('wholesale.decision')}</p>
            </div>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            {t('wholesale.submitted_label')}: {new Date(application.application?.appliedAt || "").toLocaleDateString("en-RW", { day: "numeric", month: "long", year: "numeric" })}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('wholesale.expected_48')}
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            {t('wholesale.sms_review_prefix')} <span className="font-medium text-foreground">{user.phone}</span> {t('wholesale.sms_review_suffix')}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {t('wholesale.questions_whatsapp')}: <a href="https://wa.me/250780000000" className="text-primary hover:underline">+250 780 000 000</a>
          </p>
        </div>
        <button onClick={goHome} className="mt-6 w-full text-center text-xs text-muted-foreground hover:text-foreground">
          ← {t('wholesale.continue_retail')}
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
          <h1 className="mt-4 text-xl font-bold text-emerald-900">{t('wholesale.approved_title')}</h1>
          <p className="mt-1 text-sm text-emerald-700">
            {t('wholesale.approved_welcome')}
          </p>

          <div className="mt-6 space-y-2 text-left">
            <div className="flex items-center gap-2 rounded-lg bg-white p-2 text-sm">
              <TrendingDown className="h-4 w-4 text-emerald-600" />
              <span>{t('wholesale.approved_discount')}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-white p-2 text-sm">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              <span>{t('wholesale.approved_credit')}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-white p-2 text-sm">
              <FileText className="h-4 w-4 text-emerald-600" />
              <span>{t('wholesale.approved_invoices')}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-white p-2 text-sm">
              <Truck className="h-4 w-4 text-emerald-600" />
              <span>{t('wholesale.approved_delivery')}</span>
            </div>
          </div>

          <Button className="mt-6 w-full" size="lg" onClick={() => goCatalog()}>
            {t('wholesale.start_wholesale')} →
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
          <h1 className="mt-4 text-xl font-bold text-red-900">{t('wholesale.not_approved')}</h1>
          <p className="mt-2 text-sm text-red-700">
            {t('wholesale.not_approved_hint')}
          </p>
          {application.application?.rejectionReason && (
            <div className="mt-4 rounded-lg border border-red-200 bg-white p-3 text-left">
              <p className="text-xs font-semibold text-red-800">{t('wholesale.reason')}:</p>
              <p className="mt-1 text-sm text-red-700">{application.application.rejectionReason}</p>
            </div>
          )}
          <p className="mt-4 text-sm text-muted-foreground">
            {t('wholesale.retail_call_prefix')} <a href="tel:+250780000000" className="text-primary hover:underline">+250 780 000 000</a>.
          </p>
          <div className="mt-6 space-y-2">
            <Button variant="outline" className="w-full" onClick={onApply}>
              {t('wholesale.reapply_30')}
            </Button>
            <Button className="w-full" onClick={() => goCatalog()}>
              {t('cart.continue_shopping')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Unknown status
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="text-sm text-muted-foreground">{t('orders.status_label')}: {status}</p>
      <Button className="mt-6" onClick={goHome}>{t('wholesale.back_store')}</Button>
    </div>
  )
}

// ============================================================================
// Success Page (post-submission)
// ============================================================================

function WholesaleSuccessPage({ onCheckStatus, onContinue }: { onCheckStatus: () => void; onContinue: () => void }) {
  const t = useT()
  const { user } = useStore()
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500">
          <CheckCircle2 className="h-8 w-8 text-white" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-emerald-900">{t('wholesale.application_submitted')}</h1>
        <p className="mt-2 text-sm text-emerald-700">
          {t('wholesale.review_24_48')}
        </p>

        <div className="mt-6 rounded-lg bg-white p-4 text-left">
          <p className="text-xs font-semibold text-muted-foreground">{t('wholesale.contact_on')}:</p>
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
          {t('wholesale.sms_confirmation')}
        </p>

        <div className="mt-6 space-y-2">
          <Button className="w-full" onClick={onCheckStatus}>
            {t('wholesale.check_status')}
          </Button>
          <Button variant="outline" className="w-full" onClick={onContinue}>
            {t('wholesale.continue_retail')}
          </Button>
        </div>
      </div>
    </div>
  )
}
