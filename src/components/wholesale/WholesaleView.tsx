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
import { RWANDA_DISTRICTS, RWANDA_PROVINCES } from "@/lib/rwanda-locations"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Clock,
  Store,
  FileText,
  CreditCard,
  Package,
  Loader2,
  Phone,
  XCircle,
} from "lucide-react"
import { WholesaleDashboard } from "./WholesaleDashboard"
import { WholesaleInvoices } from "./WholesaleInvoices"
import { useT } from '@/lib/i18n/LanguageContext'
import { WHOLESALE_CONFIG } from '@/lib/wholesale-config'
import FormField from '@/components/a11y/FormField'
import FormSelect from '@/components/a11y/FormSelect'
import FormTextarea from '@/components/a11y/FormTextarea'

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

  const facts = [
    { icon: Package, title: t('wholesale.honest_pricing_title'), desc: t('wholesale.honest_pricing_desc') },
    { icon: FileText, title: t('wholesale.honest_minimum_title'), desc: t('wholesale.honest_minimum_unconfigured') },
    { icon: CreditCard, title: t('wholesale.honest_credit_title'), desc: t('wholesale.honest_credit_disabled') },
    { icon: Clock, title: t('wholesale.honest_review_title'), desc: t('wholesale.honest_review_no_promise') },
  ]

  return (
    <div>
      <section className="bg-gradient-to-br from-primary to-primary/80 px-4 py-16 text-primary-foreground sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-5xl" aria-hidden="true">🏪</p>
          <h1 className="mt-4 text-3xl font-bold sm:text-5xl">{t('wholesale.honest_hero_title')}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-primary-foreground/90 sm:text-lg">
            {t('wholesale.honest_hero_subtitle')}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {isApproved ? (
              <Button size="lg" variant="secondary" onClick={onDashboard}>
                {t('wholesale.go_dashboard')} →
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

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold">{t('wholesale.honest_current_terms')}</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-muted-foreground">
            {t('wholesale.honest_terms_intro')}
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {facts.map((fact) => (
              <div key={fact.title} className="rounded-2xl border bg-card p-5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10">
                  <fact.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-3 font-semibold">{fact.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{fact.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-secondary/30 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold">{t('wholesale.who_apply')}</h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">{t('wholesale.registered_rwanda')}</p>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {BUSINESS_TYPES.map((businessType) => (
              <div key={businessType.value} className="rounded-xl border bg-card p-4 text-center text-sm font-medium">
                {t(businessType.label)}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border bg-card p-6">
            <h2 className="text-xl font-bold">{t('wholesale.honest_documents_title')}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{t('wholesale.honest_documents_initial')}</p>
            <ul className="mt-4 space-y-2 text-sm">
              {['tin', 'rdb', 'business', 'owner'].map((document) => (
                <li key={document} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{t(`wholesale.honest_document_${document}`)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">{t('wholesale.honest_documents_upload_notice')}</p>
          </div>

          <div className="rounded-2xl border bg-card p-6">
            <h2 className="text-xl font-bold">{t('wholesale.honest_process_title')}</h2>
            <ol className="mt-4 space-y-4">
              {[1, 2, 3].map((step) => (
                <li key={step} className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{step}</span>
                  <div>
                    <p className="text-sm font-semibold">{t(`wholesale.honest_step_${step}_title`)}</p>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{t(`wholesale.honest_step_${step}_desc`)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="bg-secondary/30 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold">{t('wholesale.honest_questions_title')}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t('wholesale.honest_contact_intro')}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {WHOLESALE_CONFIG.contacts.map((contact) => (
              <a
                key={contact.whatsappE164}
                href={`https://wa.me/${contact.whatsappE164}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border bg-card px-5 text-sm font-semibold hover:bg-secondary"
              >
                <Phone className="h-4 w-4 text-primary" />
                {t('wholesale.honest_whatsapp_contact', { phone: contact.displayPhone })}
              </a>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t('wholesale.honest_no_hours_promise')}</p>
        </div>
      </section>

      <section className="bg-primary px-4 py-12 text-center text-primary-foreground sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold">{t('wholesale.honest_apply_title')}</h2>
        <p className="mt-2 text-sm text-primary-foreground/90">{t('wholesale.registered_business_cta')}</p>
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')

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
    const errors: Record<string, string> = {}
    if (!businessName.trim()) errors.businessName = t('wholesale.business_name_required')
    if (!businessPhone.trim()) errors.businessPhone = t('wholesale.business_phone_required')
    if (!businessDistrict) errors.businessDistrict = t('wholesale.business_district_required')
    if (!businessAddress.trim()) errors.businessAddress = t('wholesale.business_address_required')
    return errors
  }

  const validateStep2 = () => {
    const errors: Record<string, string> = {}
    if (!ownerName.trim()) errors.ownerName = t('wholesale.owner_name_required')
    if (!ownerPhone.trim()) errors.ownerPhone = t('wholesale.owner_phone_required')
    return errors
  }

  const handleNext = () => {
    const errors = step === 1 ? validateStep1() : step === 2 ? validateStep2() : {}
    setFieldErrors(errors)
    const firstError = Object.values(errors)[0]
    if (firstError) {
      setFormError(firstError)
      toast({ title: t('wholesale.fix_errors'), description: firstError, variant: "destructive" })
      return
    }
    setFormError('')
    setStep(step + 1)
  }

  const handleSubmit = async () => {
    if (!agreeTerms || !confirmAccurate) {
      const message = t('wholesale.accept_terms_hint')
      setFormError(message)
      toast({ title: t('wholesale.accept_terms'), description: message, variant: "destructive" })
      return
    }

    setFormError('')
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
          ownerName,
          ownerPhone,
          ownerEmail: ownerEmail || undefined,
          heardFrom,
          notes: notes || undefined,
          documents: [],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('wholesale.submission_failed'))

      onSuccess()
    } catch (e) {
      const message = e instanceof Error ? e.message : t('common.error')
      setFormError(message)
      toast({
        title: t('wholesale.submission_failed'),
        description: message,
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
      {formError && <p id="wholesale-form-error" className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert" aria-live="assertive"><AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />{formError}</p>}

      {/* Step 1: Business Information */}
      {step === 1 && (
        <div className="space-y-4 rounded-2xl border bg-card p-6">
          <FormField id="biz-name" label={t('wholesale.business_name')} required error={fieldErrors.businessName} value={businessName} onChange={(event) => { setBusinessName(event.target.value); setFieldErrors((current) => ({ ...current, businessName: '' })) }} placeholder="Amina Beauty Salon" />
          <FormSelect id="biz-type" label={t('wholesale.business_type')} required value={businessType} onChange={(event) => setBusinessType(event.target.value)} options={BUSINESS_TYPES.map((businessTypeOption) => ({ value: businessTypeOption.value, label: t(businessTypeOption.label) }))} />
          <FormField id="biz-phone" label={t('wholesale.business_phone')} required error={fieldErrors.businessPhone} type="tel" value={businessPhone} onChange={(event) => { setBusinessPhone(event.target.value); setFieldErrors((current) => ({ ...current, businessPhone: '' })) }} placeholder="+250 780 000 001" autoComplete="tel" />
          <FormSelect id="biz-district" label={t('wholesale.business_district')} required error={fieldErrors.businessDistrict} value={businessDistrict} onChange={(event) => { setBusinessDistrict(event.target.value); setFieldErrors((current) => ({ ...current, businessDistrict: '' })) }} placeholder={t('checkout.district_select')} options={allDistricts.map((district) => ({ value: district, label: district }))} />
          <FormField id="biz-address" label={t('wholesale.business_address')} required error={fieldErrors.businessAddress} value={businessAddress} onChange={(event) => { setBusinessAddress(event.target.value); setFieldErrors((current) => ({ ...current, businessAddress: '' })) }} placeholder="KG 123 St, near KCT Building" />
          <div className="grid grid-cols-2 gap-3">
            <FormSelect id="years" label={t('wholesale.years_business')} value={yearsInBusiness} onChange={(event) => setYearsInBusiness(event.target.value)} options={[1, 2, 3, 5, 10, 20].map((year) => ({ value: String(year), label: t('wholesale.years_count', { count: year }) }))} />
            <FormField id="tin" label={t('wholesale.tin_optional')} value={tinNumber} onChange={(event) => setTinNumber(event.target.value)} placeholder="123456789" />
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleNext}>{t('wholesale.next_step')} →</Button>
          </div>
        </div>
      )}

      {/* Step 2: Owner Information */}
      {step === 2 && (
        <div className="space-y-4 rounded-2xl border bg-card p-6">
          <FormField id="owner-name" label={t('wholesale.owner_full_name')} required error={fieldErrors.ownerName} value={ownerName} onChange={(event) => { setOwnerName(event.target.value); setFieldErrors((current) => ({ ...current, ownerName: '' })) }} placeholder="Amina Uwase" autoComplete="name" />
          <FormField id="owner-phone" label={t('wholesale.owner_phone')} required error={fieldErrors.ownerPhone} type="tel" value={ownerPhone} onChange={(event) => { setOwnerPhone(event.target.value); setFieldErrors((current) => ({ ...current, ownerPhone: '' })) }} placeholder="+250 780 000 001" autoComplete="tel" />
          <FormField id="owner-email" label={t('wholesale.owner_email_optional')} type="email" value={ownerEmail} onChange={(event) => setOwnerEmail(event.target.value)} placeholder="amina@gmail.com" autoComplete="email" />
          <FormSelect id="revenue" label={t('wholesale.monthly_order')} value={monthlyRevenue} onChange={(event) => setMonthlyRevenue(event.target.value)} options={REVENUE_RANGES.map((range, index) => ({ value: range, label: t(`wholesale.revenue_${index}`) }))} />
          <FormSelect id="heard" label={t('wholesale.heard_about')} value={heardFrom} onChange={(event) => setHeardFrom(event.target.value)} options={HEARD_FROM_OPTIONS.map((source, index) => ({ value: source, label: t(`wholesale.heard_${index}`) }))} />
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
          <FormTextarea id="notes" label={t('wholesale.additional_notes')} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={t('wholesale.notes_placeholder')} rows={3} textareaClassName="resize-none" maxLength={1000} />
          <div className="space-y-2">
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" required aria-required="true" aria-invalid={formError && !agreeTerms ? true : undefined} aria-describedby={formError && !agreeTerms ? 'wholesale-form-error' : undefined} checked={agreeTerms} onChange={(event) => setAgreeTerms(event.target.checked)} className="mt-1 h-4 w-4 rounded" />
              <span>{t('wholesale.agree_terms')}</span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" required aria-required="true" aria-invalid={formError && !confirmAccurate ? true : undefined} aria-describedby={formError && !confirmAccurate ? 'wholesale-form-error' : undefined} checked={confirmAccurate} onChange={(event) => setConfirmAccurate(event.target.checked)} className="mt-1 h-4 w-4 rounded" />
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
      const response = await fetch('/api/wholesale/application/status')
      if (response.ok) setApplication(await response.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) load()
    else setLoading(false)
  }, [user, load])

  if (loading) {
    return <div className="mx-auto max-w-md px-4 py-20"><Skeleton className="h-48 w-full rounded-2xl" /></div>
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

  if (!application?.hasApplication) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <Store className="mx-auto h-12 w-12 text-muted-foreground/40" />
        <h1 className="mt-4 text-xl font-bold">{t('wholesale.no_application')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('wholesale.not_applied')}</p>
        <Button className="mt-6" onClick={onApply}>{t('home.apply_wholesale')} →</Button>
        <button onClick={goHome} className="mt-4 block w-full text-xs text-muted-foreground hover:text-foreground">← {t('wholesale.back_store')}</button>
      </div>
    )
  }

  const status = application.status
  const startWholesaleShopping = () => {
    if (typeof window !== 'undefined') sessionStorage.setItem('wholesaleShoppingMode', '1')
    goCatalog()
  }
  const applicationId = application.application?.id?.slice(-8).toUpperCase()

  if (status === 'PENDING') {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-2xl border bg-card p-8 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-amber-100"><Clock className="h-8 w-8 text-amber-600" /></div>
          <h1 className="mt-4 text-xl font-bold">{t('wholesale.under_review')}</h1>
          <p className="mt-1 font-mono text-sm text-muted-foreground">{t('wholesale.application_id')}: {applicationId}</p>
          <p className="mt-6 text-sm leading-6 text-muted-foreground">{t('wholesale.honest_review_no_promise')}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            {t('wholesale.submitted_label')}: {new Date(application.application?.appliedAt || '').toLocaleDateString('en-RW', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {WHOLESALE_CONFIG.contacts.map((contact) => (
              <a key={contact.whatsappE164} href={`https://wa.me/${contact.whatsappE164}`} target="_blank" rel="noopener noreferrer" className="rounded-full border px-4 py-2 text-xs font-semibold hover:bg-secondary">
                {t('wholesale.honest_whatsapp_contact', { phone: contact.displayPhone })}
              </a>
            ))}
          </div>
        </div>
        <button onClick={goHome} className="mt-6 w-full text-center text-xs text-muted-foreground hover:text-foreground">← {t('wholesale.continue_retail')}</button>
      </div>
    )
  }

  if (status === 'APPROVED') {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500"><CheckCircle2 className="h-8 w-8 text-white" /></div>
          <h1 className="mt-4 text-xl font-bold text-emerald-900">{t('wholesale.approved_title')}</h1>
          <p className="mt-2 text-sm leading-6 text-emerald-800">{t('wholesale.honest_approved_pricing')}</p>
          <div className="mt-5 rounded-xl border border-emerald-200 bg-white p-4 text-left text-sm">
            <p className="font-semibold">{t('wholesale.honest_credit_title')}</p>
            <p className="mt-1 text-muted-foreground">{t('wholesale.honest_credit_disabled')}</p>
          </div>
          <Button className="mt-6 w-full" size="lg" onClick={startWholesaleShopping}>{t('wholesale.start_wholesale')} →</Button>
        </div>
      </div>
    )
  }

  if (status === 'REJECTED') {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-100"><XCircle className="h-8 w-8 text-red-600" /></div>
          <h1 className="mt-4 text-xl font-bold text-red-900">{t('wholesale.not_approved')}</h1>
          <p className="mt-2 text-sm text-red-700">{t('wholesale.not_approved_hint')}</p>
          {application.application?.rejectionReason && (
            <div className="mt-4 rounded-lg border border-red-200 bg-white p-3 text-left">
              <p className="text-xs font-semibold text-red-800">{t('wholesale.reason')}:</p>
              <p className="mt-1 text-sm text-red-700">{application.application.rejectionReason}</p>
            </div>
          )}
          <div className="mt-6 space-y-2">
            <Button variant="outline" className="w-full" onClick={onApply}>{t('wholesale.honest_submit_updated_application')}</Button>
            <Button className="w-full" onClick={() => goCatalog()}>{t('cart.continue_shopping')}</Button>
          </div>
        </div>
      </div>
    )
  }

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
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500">
          <CheckCircle2 className="h-8 w-8 text-white" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-emerald-900">{t('wholesale.application_submitted')}</h1>
        <p className="mt-2 text-sm leading-6 text-emerald-800">{t('wholesale.honest_submission_received')}</p>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">{t('wholesale.honest_review_no_promise')}</p>
        <div className="mt-6 space-y-2">
          <Button className="w-full" onClick={onCheckStatus}>{t('wholesale.check_status')}</Button>
          <Button variant="outline" className="w-full" onClick={onContinue}>{t('wholesale.continue_retail')}</Button>
        </div>
      </div>
    </div>
  )
}
