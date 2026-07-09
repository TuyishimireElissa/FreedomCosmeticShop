"use client"

/**
 * AdminMarketing — unified marketing workspace for coupons, banners, and SMS campaigns.
 *
 * Section 9 — Marketing Tools.
 *
 * Tabs:
 *   1. Overview  — cross-channel KPIs (active coupons, redemptions, revenue from coupons,
 *                  banners live, scheduled campaigns, recent activity feed)
 *   2. Coupons   — enhanced list with revenue stats, share-via-SMS, quick-create templates,
 *                  duplicate, copy-code, status filter (active/expired/upcoming)
 *   3. Banners   — enhanced grid with preview thumbnails, scheduling status badges
 *                  (scheduled/live/ended), quick toggle active
 *   4. Campaigns — enhanced SMS scheduling with audience segment selector
 *                  (All / VIP / Loyal / New / At-risk), language toggle (EN / RW / Both),
 *                  coupon attachment, cost estimate, scheduled list with cancel
 *
 * NOTE: This component does NOT replace the existing Settings (Coupons/Banners sub-tabs)
 *       or SMS tab — those remain untouched. This is an additive, unified marketing
 *       workspace surfaced as a new "Marketing" top-level tab.
 *
 * APIs used:
 *   GET    /api/admin/coupons           (with revenueGenerated field)
 *   POST   /api/admin/coupons
 *   PUT    /api/admin/coupons/:id
 *   DELETE /api/admin/coupons/:id
 *   GET    /api/admin/banners
 *   POST   /api/admin/banners
 *   PUT    /api/admin/banners/:id
 *   DELETE /api/admin/banners/:id
 *   GET    /api/admin/customers         (for audience targeting)
 *   POST   /api/sms/scheduled           (campaign scheduling)
 *   GET    /api/sms/scheduled           (campaign list)
 *   POST   /api/sms/send                (share coupon via SMS)
 *   GET    /api/sms/stats               (overview KPIs)
 */

import { useEffect, useState, useCallback, useMemo } from "react"
import { formatRWF, formatRWFCompact } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import {
  Megaphone,
  Tag,
  Image as ImageIcon,
  Send,
  Clock,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Copy,
  CheckCircle2,
  XCircle,
  Calendar,
  TrendingUp,
  Users,
  Gift,
  Sparkles,
  MessageSquare,
  Eye,
  Radio,
  Languages,
  RefreshCw,
} from "lucide-react"

// ============================================================================
// Types
// ============================================================================

interface Coupon {
  id: string
  code: string
  description: string | null
  type: "PERCENTAGE" | "FIXED" | "FREE_SHIPPING"
  value: number
  minOrderAmount: number | null
  maxDiscountAmount: number | null
  usageLimit: number | null
  usageLimitPerUser: number
  usedCount: number
  revenueGenerated: number
  startsAt: string
  endsAt: string | null
  isActive: boolean
  createdAt: string
}

interface Banner {
  id: string
  title: string
  subtitle: string | null
  image: string
  mobileImage: string | null
  linkType: string | null
  linkUrl: string | null
  placement: string
  startsAt: string | null
  endsAt: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
}

interface Customer {
  id: string
  name: string
  phone: string
  email: string | null
  createdAt: string
  loyaltyPoints: number
  orderCount: number
  totalSpent: number
  lastOrderDate: string | null
}

interface ScheduledCampaign {
  id: string
  name: string
  message: string
  recipients: string[]
  scheduledAt: string
  status: string
  sentCount?: number
}

// ============================================================================
// Constants
// ============================================================================

type CouponPreset = {
  code: string
  description: string
  type: Coupon["type"]
  value: number
  minOrderAmount: number
  maxDiscountAmount: number | null
  usageLimit: number | null
  usageLimitPerUser: number
  endsAt: string
}

const COUPON_TEMPLATES: { label: string; preset: CouponPreset }[] = [
  {
    label: "10% off welcome",
    preset: {
      code: "WELCOME10",
      description: "Welcome offer for new customers",
      type: "PERCENTAGE",
      value: 10,
      minOrderAmount: 0,
      maxDiscountAmount: 10000,
      usageLimit: null,
      usageLimitPerUser: 1,
      endsAt: "",
    },
  },
  {
    label: "20% off weekend",
    preset: {
      code: "WEEKEND20",
      description: "Weekend flash sale — 20% off",
      type: "PERCENTAGE",
      value: 20,
      minOrderAmount: 25000,
      maxDiscountAmount: 25000,
      usageLimit: 100,
      usageLimitPerUser: 1,
      endsAt: "",
    },
  },
  {
    label: "5,000 RWF off",
    preset: {
      code: "BEAUTY5000",
      description: "RWF 5,000 off orders above 50,000",
      type: "FIXED",
      value: 5000,
      minOrderAmount: 50000,
      maxDiscountAmount: null,
      usageLimit: null,
      usageLimitPerUser: 1,
      endsAt: "",
    },
  },
  {
    label: "Free shipping",
    preset: {
      code: "FREESHIP",
      description: "Free shipping on any order",
      type: "FREE_SHIPPING",
      value: 0,
      minOrderAmount: 0,
      maxDiscountAmount: null,
      usageLimit: null,
      usageLimitPerUser: 1,
      endsAt: "",
    },
  },
]

const PLACEMENT_LABELS: Record<string, { label: string; icon: string }> = {
  HOME_HERO: { label: "Home Hero", icon: "🏠" },
  HOME_PROMO: { label: "Home Promo", icon: "📣" },
  SIDEBAR: { label: "Sidebar", icon: "📋" },
  CATEGORY_TOP: { label: "Category Top", icon: "🏷️" },
  CHECKOUT_BANNER: { label: "Checkout", icon: "💳" },
}

type SegmentKey = "all" | "vip" | "loyal" | "new" | "at_risk" | "regular"

const SEGMENT_OPTIONS: { value: SegmentKey; label: string; description: string }[] = [
  { value: "all", label: "All customers", description: "Every customer in the database" },
  { value: "vip", label: "VIP only", description: "Customers who spent ≥ RWF 100,000" },
  { value: "loyal", label: "Loyal only", description: "Customers with 3+ orders" },
  { value: "new", label: "New only", description: "Customers who joined within 14 days" },
  { value: "at_risk", label: "At-risk only", description: "No order in 60+ days" },
  { value: "regular", label: "Regular only", description: "Default segment" },
]

const VIP_THRESHOLD = 100_000
const LOYAL_ORDER_THRESHOLD = 3
const NEW_CUSTOMER_DAYS = 14
const AT_RISK_DAYS = 60

// Rwanda SMS cost estimate (RWF per segment). Real cost varies by provider.
const SMS_COST_PER_SEGMENT = 7 // RWF

// ============================================================================
// Helpers
// ============================================================================

function classifySegment(c: Customer): Exclude<SegmentKey, "all"> {
  if (c.totalSpent >= VIP_THRESHOLD) return "vip"
  if (c.orderCount >= LOYAL_ORDER_THRESHOLD) return "loyal"
  const daysSinceJoined = (Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  if (daysSinceJoined <= NEW_CUSTOMER_DAYS) return "new"
  if (c.orderCount > 0 && c.lastOrderDate) {
    const daysSinceLast = (Date.now() - new Date(c.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceLast >= AT_RISK_DAYS) return "at_risk"
  }
  return "regular"
}

function couponStatus(c: Coupon): "active" | "expired" | "upcoming" | "inactive" {
  if (!c.isActive) return "inactive"
  const now = Date.now()
  const starts = new Date(c.startsAt).getTime()
  const ends = c.endsAt ? new Date(c.endsAt).getTime() : null
  if (now < starts) return "upcoming"
  if (ends && now > ends) return "expired"
  if (c.usageLimit && c.usedCount >= c.usageLimit) return "expired"
  return "active"
}

function bannerStatus(b: Banner): "scheduled" | "live" | "ended" | "inactive" {
  if (!b.isActive) return "inactive"
  const now = Date.now()
  const starts = b.startsAt ? new Date(b.startsAt).getTime() : null
  const ends = b.endsAt ? new Date(b.endsAt).getTime() : null
  if (starts && now < starts) return "scheduled"
  if (ends && now > ends) return "ended"
  return "live"
}

function formatDiscount(c: Coupon): string {
  if (c.type === "PERCENTAGE") return `${c.value}% off`
  if (c.type === "FIXED") return `${formatRWF(c.value)} off`
  return "Free shipping"
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-RW", { day: "numeric", month: "short", year: "numeric" })
}

// ============================================================================
// Component
// ============================================================================

export function AdminMarketing() {
  return (
    <div>
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Megaphone className="h-5 w-5 text-primary" />
          Marketing
        </h2>
        <p className="text-sm text-muted-foreground">
          Coupons, banners, and SMS campaigns — unified marketing workspace.
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-4 grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="overview" className="gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="coupons" className="gap-1">
            <Tag className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Coupons</span>
          </TabsTrigger>
          <TabsTrigger value="banners" className="gap-1">
            <ImageIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Banners</span>
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-1">
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Campaigns</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="coupons">
          <CouponsTab />
        </TabsContent>
        <TabsContent value="banners">
          <BannersTab />
        </TabsContent>
        <TabsContent value="campaigns">
          <CampaignsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================================================
// Overview Tab
// ============================================================================

function OverviewTab() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [banners, setBanners] = useState<Banner[]>([])
  const [campaigns, setCampaigns] = useState<ScheduledCampaign[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [couponsRes, bannersRes, campaignsRes] = await Promise.all([
        fetch("/api/admin/coupons").catch(() => null),
        fetch("/api/admin/banners").catch(() => null),
        fetch("/api/sms/scheduled").catch(() => null),
      ])

      if (couponsRes?.ok) {
        const data = await couponsRes.json()
        setCoupons(data.coupons || [])
      }
      if (bannersRes?.ok) {
        const data = await bannersRes.json()
        setBanners(data.banners || [])
      }
      if (campaignsRes?.ok) {
        const data = await campaignsRes.json()
        setCampaigns(data.scheduled || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return <Skeleton className="h-96 rounded-2xl" />
  }

  // KPIs
  const activeCoupons = coupons.filter((c) => couponStatus(c) === "active").length
  const totalRedemptions = coupons.reduce((sum, c) => sum + c.usedCount, 0)
  const revenueFromCoupons = coupons.reduce((sum, c) => sum + c.revenueGenerated, 0)
  const liveBanners = banners.filter((b) => bannerStatus(b) === "live").length
  const scheduledCampaigns = campaigns.filter((c) => c.status === "scheduled").length
  const totalReach = campaigns
    .filter((c) => c.status === "scheduled")
    .reduce((sum, c) => sum + c.recipients.length, 0)

  // Top performing coupons
  const topCoupons = [...coupons]
    .sort((a, b) => b.revenueGenerated - a.revenueGenerated)
    .slice(0, 5)

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          icon={<Tag className="h-4 w-4 text-primary" />}
          label="Active coupons"
          value={activeCoupons.toString()}
        />
        <KpiCard
          icon={<Gift className="h-4 w-4 text-emerald-500" />}
          label="Total redemptions"
          value={totalRedemptions.toString()}
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4 text-violet-500" />}
          label="Coupon revenue"
          value={formatRWFCompact(revenueFromCoupons)}
        />
        <KpiCard
          icon={<ImageIcon className="h-4 w-4 text-sky-500" />}
          label="Live banners"
          value={liveBanners.toString()}
        />
        <KpiCard
          icon={<Clock className="h-4 w-4 text-amber-500" />}
          label="Scheduled campaigns"
          value={scheduledCampaigns.toString()}
        />
        <KpiCard
          icon={<Users className="h-4 w-4 text-rose-500" />}
          label="Total reach"
          value={totalReach.toString()}
          sub="recipients"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top performing coupons */}
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-primary" />
            Top performing coupons
          </h3>
          {topCoupons.length === 0 || topCoupons[0].revenueGenerated === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No coupon redemptions yet. Create a coupon and share it via SMS to start tracking performance.
            </p>
          ) : (
            <div className="space-y-2">
              {topCoupons.map((c, i) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-secondary text-xs font-bold">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-mono text-sm font-semibold">{c.code}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDiscount(c)} · {c.usedCount} redemptions
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-emerald-600">
                    {formatRWFCompact(c.revenueGenerated)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent / scheduled campaigns */}
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Clock className="h-4 w-4 text-primary" />
            Upcoming campaigns
          </h3>
          {campaigns.filter((c) => c.status === "scheduled").length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No scheduled campaigns. Switch to the Campaigns tab to schedule one.
            </p>
          ) : (
            <div className="space-y-2">
              {campaigns
                .filter((c) => c.status === "scheduled")
                .slice(0, 5)
                .map((c) => (
                  <div key={c.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{c.name}</p>
                      <Badge variant="secondary" className="text-[10px]">
                        {c.recipients.length} recipients
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{c.message}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      <Calendar className="mr-1 inline h-3 w-3" />
                      {new Date(c.scheduledAt).toLocaleString("en-RW", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {icon}
      </div>
      <p className="mt-2 text-xl font-bold">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

// ============================================================================
// Coupons Tab — enhanced with revenue stats, share-via-SMS, templates, duplicate
// ============================================================================

function CouponsTab() {
  const { toast } = useToast()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Coupon | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null)
  const [saving, setSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [shareTarget, setShareTarget] = useState<Coupon | null>(null)

  const [form, setForm] = useState({
    code: "",
    description: "",
    type: "PERCENTAGE" as Coupon["type"],
    value: "10",
    minOrderAmount: "",
    maxDiscountAmount: "",
    usageLimit: "",
    usageLimitPerUser: "1",
    startsAt: new Date().toISOString().slice(0, 10),
    endsAt: "",
    isActive: true,
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/coupons")
      if (res.status === 401 || res.status === 403) return
      const data = await res.json()
      setCoupons(data.coupons || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = (preset?: CouponPreset) => {
    setEditing(null)
    setForm({
      code: preset?.code || "",
      description: preset?.description || "",
      type: preset?.type || "PERCENTAGE",
      value: preset ? String(preset.value) : "10",
      minOrderAmount: preset?.minOrderAmount ? String(preset.minOrderAmount) : "",
      maxDiscountAmount: preset?.maxDiscountAmount ? String(preset.maxDiscountAmount) : "",
      usageLimit: preset?.usageLimit ? String(preset.usageLimit) : "",
      usageLimitPerUser: preset ? String(preset.usageLimitPerUser) : "1",
      startsAt: new Date().toISOString().slice(0, 10),
      endsAt: preset?.endsAt || "",
      isActive: true,
    })
    setShowForm(true)
  }

  const openEdit = (c: Coupon) => {
    setEditing(c)
    setForm({
      code: c.code,
      description: c.description || "",
      type: c.type,
      value: String(c.value),
      minOrderAmount: c.minOrderAmount ? String(c.minOrderAmount) : "",
      maxDiscountAmount: c.maxDiscountAmount ? String(c.maxDiscountAmount) : "",
      usageLimit: c.usageLimit ? String(c.usageLimit) : "",
      usageLimitPerUser: String(c.usageLimitPerUser),
      startsAt: new Date(c.startsAt).toISOString().slice(0, 10),
      endsAt: c.endsAt ? new Date(c.endsAt).toISOString().slice(0, 10) : "",
      isActive: c.isActive,
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.code.trim()) {
      toast({ title: "Code is required", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const payload = {
        code: form.code.toUpperCase().trim(),
        description: form.description || undefined,
        type: form.type,
        value: Number(form.value) || 0,
        minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : null,
        maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : null,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        usageLimitPerUser: Number(form.usageLimitPerUser) || 1,
        startsAt: form.startsAt,
        endsAt: form.endsAt || null,
        isActive: form.isActive,
      }
      const url = editing ? `/api/admin/coupons/${editing.id}` : "/api/admin/coupons"
      const method = editing ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Save failed")
      }
      toast({
        title: editing ? "Coupon updated" : "Coupon created",
        description: payload.code,
      })
      setShowForm(false)
      load()
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/admin/coupons/${deleteTarget.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      toast({ title: "Coupon deleted", description: deleteTarget.code })
      setDeleteTarget(null)
      load()
    } catch (e) {
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    }
  }

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      toast({ title: "Code copied", description: code })
    } catch {
      toast({ title: "Copy failed", variant: "destructive" })
    }
  }

  const duplicate = (c: Coupon) => {
    openCreate({
      code: `${c.code}_COPY`,
      description: c.description || "",
      type: c.type,
      value: c.value,
      minOrderAmount: c.minOrderAmount ?? 0,
      maxDiscountAmount: c.maxDiscountAmount,
      usageLimit: c.usageLimit,
      usageLimitPerUser: c.usageLimitPerUser,
      endsAt: c.endsAt ? new Date(c.endsAt).toISOString().slice(0, 10) : "",
    })
  }

  const filtered = useMemo(() => {
    if (statusFilter === "all") return coupons
    return coupons.filter((c) => couponStatus(c) === statusFilter)
  }, [coupons, statusFilter])

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Quick-create templates */}
      <div className="mb-4 rounded-2xl border bg-secondary/20 p-4">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          Quick-create from template
        </p>
        <div className="flex flex-wrap gap-2">
          {COUPON_TEMPLATES.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => openCreate(t.preset)}
              className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
            >
              <Sparkles className="h-3 w-3 text-primary" />
              {t.label}
            </button>
          ))}
          <Button size="sm" variant="outline" onClick={() => openCreate()} className="h-8">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Custom
          </Button>
        </div>
      </div>

      {/* Filter + count */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filtered.length} coupon{filtered.length !== 1 ? "s" : ""}
        </p>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">✅ Active</SelectItem>
            <SelectItem value="upcoming">🕐 Upcoming</SelectItem>
            <SelectItem value="expired">⏰ Expired</SelectItem>
            <SelectItem value="inactive">⏸️ Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-12 text-center">
          <Tag className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <h3 className="mt-3 font-semibold">No coupons found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {statusFilter !== "all"
              ? `No ${statusFilter} coupons. Try another filter.`
              : "Create your first coupon to start tracking redemptions."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const status = couponStatus(c)
            const statusBadge: Record<string, { label: string; class: string }> = {
              active: { label: "✅ Active", class: "bg-emerald-100 text-emerald-700" },
              upcoming: { label: "🕐 Upcoming", class: "bg-sky-100 text-sky-700" },
              expired: { label: "⏰ Expired", class: "bg-red-100 text-red-700" },
              inactive: { label: "⏸️ Inactive", class: "bg-secondary text-secondary-foreground" },
            }
            return (
              <div
                key={c.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold">{c.code}</span>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge[status].class}`}
                    >
                      {statusBadge[status].label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDiscount(c)}
                    {c.minOrderAmount ? ` · Min ${formatRWF(c.minOrderAmount)}` : ""}
                    {c.maxDiscountAmount ? ` · Cap ${formatRWF(c.maxDiscountAmount)}` : ""}
                  </p>
                  {c.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{c.description}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                    <span>
                      <Gift className="mr-1 inline h-3 w-3" />
                      {c.usedCount}
                      {c.usageLimit ? `/${c.usageLimit}` : ""} redemptions
                    </span>
                    <span>
                      <TrendingUp className="mr-1 inline h-3 w-3 text-emerald-500" />
                      {formatRWF(c.revenueGenerated)} revenue
                    </span>
                    <span>
                      <Calendar className="mr-1 inline h-3 w-3" />
                      {formatDate(c.startsAt)}
                      {c.endsAt ? ` → ${formatDate(c.endsAt)}` : " → ∞"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Copy code"
                    onClick={() => copyCode(c.code)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Share via SMS"
                    onClick={() => setShareTarget(c)}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Duplicate"
                    onClick={() => duplicate(c)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Edit"
                    onClick={() => openEdit(c)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    title="Delete"
                    onClick={() => setDeleteTarget(c)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Coupon form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit coupon" : "Add coupon"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="c-code">Code *</Label>
              <Input
                id="c-code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="WELCOME10"
                className="font-mono"
              />
            </div>
            <div>
              <Label htmlFor="c-desc">Description</Label>
              <Input
                id="c-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="10% off for new customers"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="c-type">Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as Coupon["type"] })}
                >
                  <SelectTrigger id="c-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Percentage off</SelectItem>
                    <SelectItem value="FIXED">Fixed RWF off</SelectItem>
                    <SelectItem value="FREE_SHIPPING">Free shipping</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="c-value">
                  {form.type === "PERCENTAGE" ? "Discount (%)" : form.type === "FIXED" ? "Discount (RWF)" : "Value (n/a)"}
                </Label>
                <Input
                  id="c-value"
                  type="number"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  disabled={form.type === "FREE_SHIPPING"}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="c-min">Min order (RWF)</Label>
                <Input
                  id="c-min"
                  type="number"
                  value={form.minOrderAmount}
                  onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="c-max">Max discount (RWF)</Label>
                <Input
                  id="c-max"
                  type="number"
                  value={form.maxDiscountAmount}
                  onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })}
                  placeholder="No cap"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="c-limit">Total usage limit</Label>
                <Input
                  id="c-limit"
                  type="number"
                  value={form.usageLimit}
                  onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                  placeholder="Unlimited"
                />
              </div>
              <div>
                <Label htmlFor="c-per">Per user limit</Label>
                <Input
                  id="c-per"
                  type="number"
                  value={form.usageLimitPerUser}
                  onChange={(e) => setForm({ ...form, usageLimitPerUser: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="c-start">Starts on</Label>
                <Input
                  id="c-start"
                  type="date"
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="c-end">Ends on (optional)</Label>
                <Input
                  id="c-end"
                  type="date"
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
              <Label className="text-sm font-normal">Active</Label>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              {editing ? "Save changes" : "Create coupon"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete coupon?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-mono font-semibold">{deleteTarget?.code}</span>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share via SMS */}
      {shareTarget && (
        <ShareCouponModal
          coupon={shareTarget}
          onClose={() => setShareTarget(null)}
          onSent={() => {
            setShareTarget(null)
            load()
          }}
        />
      )}
    </div>
  )
}

// ============================================================================
// Banners Tab — enhanced with preview, scheduling status, quick toggle
// ============================================================================

function BannersTab() {
  const { toast } = useToast()
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Banner | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null)
  const [saving, setSaving] = useState(false)
  const [previewTarget, setPreviewTarget] = useState<Banner | null>(null)

  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    image: "",
    mobileImage: "",
    placement: "HOME_HERO",
    linkUrl: "",
    startsAt: "",
    endsAt: "",
    isActive: true,
    sortOrder: "0",
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/banners")
      if (res.status === 401 || res.status === 403) return
      const data = await res.json()
      setBanners(data.banners || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm({
      title: "",
      subtitle: "",
      image: "",
      mobileImage: "",
      placement: "HOME_HERO",
      linkUrl: "",
      startsAt: "",
      endsAt: "",
      isActive: true,
      sortOrder: "0",
    })
    setShowForm(true)
  }

  const openEdit = (b: Banner) => {
    setEditing(b)
    setForm({
      title: b.title,
      subtitle: b.subtitle || "",
      image: b.image,
      mobileImage: b.mobileImage || "",
      placement: b.placement,
      linkUrl: b.linkUrl || "",
      startsAt: b.startsAt ? b.startsAt.slice(0, 10) : "",
      endsAt: b.endsAt ? b.endsAt.slice(0, 10) : "",
      isActive: b.isActive,
      sortOrder: String(b.sortOrder),
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.title || !form.image) {
      toast({ title: "Title and image are required", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: form.title,
        subtitle: form.subtitle || null,
        image: form.image,
        mobileImage: form.mobileImage || null,
        placement: form.placement,
        linkUrl: form.linkUrl || null,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder) || 0,
      }
      const url = editing ? `/api/admin/banners/${editing.id}` : "/api/admin/banners"
      const method = editing ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Save failed")
      toast({ title: editing ? "Banner updated" : "Banner created" })
      setShowForm(false)
      load()
    } catch {
      toast({ title: "Save failed", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await fetch(`/api/admin/banners/${deleteTarget.id}`, { method: "DELETE" })
      toast({ title: "Banner deleted" })
      setDeleteTarget(null)
      load()
    } catch {
      toast({ title: "Delete failed", variant: "destructive" })
    }
  }

  const quickToggle = async (b: Banner) => {
    try {
      const res = await fetch(`/api/admin/banners/${b.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !b.isActive }),
      })
      if (!res.ok) throw new Error("Toggle failed")
      toast({
        title: b.isActive ? "Banner deactivated" : "Banner activated",
        description: b.title,
      })
      load()
    } catch {
      toast({ title: "Toggle failed", variant: "destructive" })
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {banners.length} banner{banners.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" /> Add banner
        </Button>
      </div>

      {banners.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-12 text-center">
          <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <h3 className="mt-3 font-semibold">No banners yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create banners for the homepage hero, sidebar, and checkout.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {banners.map((b) => {
            const status = bannerStatus(b)
            const statusBadge: Record<string, { label: string; class: string }> = {
              live: { label: "● Live", class: "bg-emerald-100 text-emerald-700" },
              scheduled: { label: "🕐 Scheduled", class: "bg-sky-100 text-sky-700" },
              ended: { label: "⏰ Ended", class: "bg-secondary text-secondary-foreground" },
              inactive: { label: "⏸️ Inactive", class: "bg-secondary text-secondary-foreground" },
            }
            const placement = PLACEMENT_LABELS[b.placement] || { label: b.placement, icon: "📍" }
            return (
              <div key={b.id} className="overflow-hidden rounded-xl border bg-card">
                {/* Preview thumbnail */}
                <div
                  className="relative h-32 cursor-pointer bg-secondary"
                  onClick={() => setPreviewTarget(b)}
                >
                  {b.image ? (
                    <img
                      src={b.image}
                      alt={b.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-muted-foreground">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                  <div className="absolute left-2 top-2 flex gap-1">
                    <span className="rounded bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                      {placement.icon} {placement.label}
                    </span>
                  </div>
                  <div className="absolute right-2 top-2">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-medium ${statusBadge[status].class}`}
                    >
                      {statusBadge[status].label}
                    </span>
                  </div>
                  <div className="absolute bottom-2 right-2 rounded bg-black/60 p-1 text-white opacity-0 transition-opacity hover:opacity-100">
                    <Eye className="h-3 w-3" />
                  </div>
                </div>

                {/* Body */}
                <div className="p-3">
                  <p className="font-semibold">{b.title}</p>
                  {b.subtitle && (
                    <p className="line-clamp-1 text-xs text-muted-foreground">{b.subtitle}</p>
                  )}
                  {b.linkUrl && (
                    <p className="mt-1 truncate text-[10px] text-primary">{b.linkUrl}</p>
                  )}
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {b.startsAt && <span>From {formatDate(b.startsAt)}</span>}
                    {b.endsAt && <span> → {formatDate(b.endsAt)}</span>}
                    {!b.startsAt && !b.endsAt && <span>No scheduling — always visible when active</span>}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={b.isActive}
                        onCheckedChange={() => quickToggle(b)}
                        className="scale-90"
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {b.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Preview"
                        onClick={() => setPreviewTarget(b)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Edit"
                        onClick={() => openEdit(b)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        title="Delete"
                        onClick={() => setDeleteTarget(b)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Banner form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit banner" : "Add banner"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="b-title">Title *</Label>
              <Input
                id="b-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Summer Sale — up to 30% off"
              />
            </div>
            <div>
              <Label htmlFor="b-sub">Subtitle</Label>
              <Input
                id="b-sub"
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                placeholder="On all skincare products"
              />
            </div>
            <div>
              <Label htmlFor="b-image">Image URL *</Label>
              <Input
                id="b-image"
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                placeholder="https://..."
              />
              {form.image && (
                <div className="mt-2 h-24 overflow-hidden rounded-lg border">
                  <img src={form.image} alt="Preview" className="h-full w-full object-cover" />
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="b-mobile">Mobile image URL (optional)</Label>
              <Input
                id="b-mobile"
                value={form.mobileImage}
                onChange={(e) => setForm({ ...form, mobileImage: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="b-placement">Placement</Label>
                <Select
                  value={form.placement}
                  onValueChange={(v) => setForm({ ...form, placement: v })}
                >
                  <SelectTrigger id="b-placement">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLACEMENT_LABELS).map(([code, info]) => (
                      <SelectItem key={code} value={code}>
                        {info.icon} {info.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="b-sort">Sort order</Label>
                <Input
                  id="b-sort"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="b-link">Link URL (optional)</Label>
              <Input
                id="b-link"
                value={form.linkUrl}
                onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                placeholder="/products/skincare"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="b-start">Starts on (optional)</Label>
                <Input
                  id="b-start"
                  type="date"
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="b-end">Ends on (optional)</Label>
                <Input
                  id="b-end"
                  type="date"
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
              <Label className="text-sm font-normal">Active</Label>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              {editing ? "Save changes" : "Create banner"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete banner?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-semibold">{deleteTarget?.title}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview modal */}
      <Dialog open={!!previewTarget} onOpenChange={(o) => !o && setPreviewTarget(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewTarget?.title}</DialogTitle>
          </DialogHeader>
          {previewTarget?.image && (
            <img
              src={previewTarget.image}
              alt={previewTarget.title}
              className="w-full rounded-lg"
            />
          )}
          {previewTarget?.subtitle && (
            <p className="text-sm text-muted-foreground">{previewTarget.subtitle}</p>
          )}
          {previewTarget?.linkUrl && (
            <p className="text-xs text-primary">Links to: {previewTarget.linkUrl}</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================================
// Campaigns Tab — enhanced SMS scheduling with audience targeting + coupon attachment
// ============================================================================

function CampaignsTab() {
  const { toast } = useToast()
  const [campaigns, setCampaigns] = useState<ScheduledCampaign[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [scheduling, setScheduling] = useState(false)

  // Form
  const [name, setName] = useState("")
  const [messageEn, setMessageEn] = useState("")
  const [messageRw, setMessageRw] = useState("")
  const [language, setLanguage] = useState<"en" | "rw" | "both">("en")
  const [segment, setSegment] = useState<SegmentKey>("all")
  const [customRecipients, setCustomRecipients] = useState("")
  const [useCustom, setUseCustom] = useState(false)
  const [attachedCouponId, setAttachedCouponId] = useState<string>("none")
  const [scheduledAt, setScheduledAt] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [campRes, custRes, coupRes] = await Promise.all([
        fetch("/api/sms/scheduled").catch(() => null),
        fetch("/api/admin/customers?pageSize=200").catch(() => null),
        fetch("/api/admin/coupons").catch(() => null),
      ])
      if (campRes?.ok) {
        const d = await campRes.json()
        setCampaigns(d.scheduled || [])
      }
      if (custRes?.ok) {
        const d = await custRes.json()
        setCustomers(d.customers || [])
      }
      if (coupRes?.ok) {
        const d = await coupRes.json()
        setCoupons(d.coupons || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Compute recipients based on segment + custom toggle
  const audience = useMemo(() => {
    if (useCustom) {
      return customRecipients
        .split(/[\s,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    }
    if (segment === "all") return customers.map((c) => c.phone)
    return customers.filter((c) => classifySegment(c) === segment).map((c) => c.phone)
  }, [useCustom, customRecipients, segment, customers])

  const finalMessage = useMemo(() => {
    const coupon = coupons.find((c) => c.id === attachedCouponId)
    const base = language === "both" ? messageEn : language === "en" ? messageEn : messageRw
    if (!coupon) return base
    const couponLine = ` Use code ${coupon.code} for ${formatDiscount(coupon)}.`
    return base + couponLine
  }, [language, messageEn, messageRw, attachedCouponId, coupons])

  const segments = Math.ceil(finalMessage.length / 160) || 1
  const estimatedCost = audience.length * segments * SMS_COST_PER_SEGMENT
  const totalSmsCount = language === "both" ? audience.length * 2 : audience.length

  const handleSchedule = async () => {
    if (!name || !finalMessage || !scheduledAt) {
      toast({
        title: "Missing fields",
        description: "Name, message, and send date are required.",
        variant: "destructive",
      })
      return
    }
    if (audience.length === 0) {
      toast({
        title: "No recipients",
        description: "Select an audience segment or add custom phone numbers.",
        variant: "destructive",
      })
      return
    }
    setScheduling(true)
    try {
      // If "both" languages, schedule two separate campaigns (EN + RW)
      const tasks: Promise<Response>[] = []
      if (language === "en" || language === "both") {
        tasks.push(
          fetch("/api/sms/scheduled", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: language === "both" ? `${name} (EN)` : name,
              message: language === "both"
                ? finalMessage // already includes coupon suffix
                : finalMessage,
              recipients: audience,
              broadcast: false,
              scheduledAt,
              language: "en",
            }),
          })
        )
      }
      if (language === "rw" || language === "both") {
        const rwMessage = (language === "rw" ? messageRw : messageRw) +
          (coupons.find((c) => c.id === attachedCouponId)
            ? ` Koresha kode ${coupons.find((c) => c.id === attachedCouponId)!.code}.`
            : "")
        tasks.push(
          fetch("/api/sms/scheduled", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: language === "both" ? `${name} (RW)` : name,
              message: rwMessage,
              recipients: audience,
              broadcast: false,
              scheduledAt,
              language: "rw",
            }),
          })
        )
      }
      const results = await Promise.all(tasks)
      const failed = results.filter((r) => !r.ok)
      if (failed.length > 0) {
        throw new Error(`${failed.length} of ${results.length} scheduling requests failed`)
      }
      toast({
        title: "Campaign scheduled!",
        description: `Reach: ${totalSmsCount} SMS · ${audience.length} recipients · Est. cost ${formatRWF(estimatedCost)}`,
      })
      // Reset
      setName("")
      setMessageEn("")
      setMessageRw("")
      setScheduledAt("")
      setAttachedCouponId("none")
      setCustomRecipients("")
      load()
    } catch (e) {
      toast({
        title: "Schedule failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setScheduling(false)
    }
  }

  const cancelCampaign = async (id: string) => {
    try {
      const res = await fetch(`/api/sms/scheduled`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error("Cancel failed")
      toast({ title: "Campaign cancelled" })
      load()
    } catch {
      toast({ title: "Cancel failed", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-4">
      {/* Schedule form */}
      <div className="rounded-2xl border bg-card p-5">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Radio className="h-5 w-5 text-primary" /> New campaign
        </h3>

        <div className="space-y-3">
          <div>
            <Label htmlFor="camp-name">Campaign name</Label>
            <Input
              id="camp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Weekend skincare promo"
            />
          </div>

          {/* Audience selector */}
          <div className="rounded-lg border p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Audience
            </p>
            <div className="flex items-center gap-4 text-sm">
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={!useCustom}
                  onChange={() => setUseCustom(false)}
                  className="h-3.5 w-3.5"
                />
                Segment
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={useCustom}
                  onChange={() => setUseCustom(true)}
                  className="h-3.5 w-3.5"
                />
                Custom phone list
              </label>
            </div>

            {!useCustom ? (
              <>
                <Select value={segment} onValueChange={(v) => setSegment(v as SegmentKey)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEGMENT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {SEGMENT_OPTIONS.find((s) => s.value === segment)?.description}
                </p>
              </>
            ) : (
              <Textarea
                value={customRecipients}
                onChange={(e) => setCustomRecipients(e.target.value)}
                placeholder="+250788123456, +250799876543"
                rows={2}
                className="mt-2 resize-none"
              />
            )}

            <p className="mt-2 text-xs">
              <span className="font-semibold text-primary">{audience.length}</span> recipients selected
            </p>
          </div>

          {/* Language + coupon */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="flex items-center gap-1.5 text-xs">
                <Languages className="h-3.5 w-3.5" />
                Language
              </Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as "en" | "rw" | "both")}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">🇬🇧 English only</SelectItem>
                  <SelectItem value="rw">🇷🇼 Kinyarwanda only</SelectItem>
                  <SelectItem value="both">Both (EN + RW)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="flex items-center gap-1.5 text-xs">
                <Tag className="h-3.5 w-3.5" />
                Attach coupon (optional)
              </Label>
              <Select value={attachedCouponId} onValueChange={setAttachedCouponId}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No coupon</SelectItem>
                  {coupons
                    .filter((c) => couponStatus(c) === "active")
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.code} — {formatDiscount(c)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Message editors */}
          {(language === "en" || language === "both") && (
            <div>
              <Label htmlFor="msg-en" className="text-xs">
                🇬🇧 English message
              </Label>
              <Textarea
                id="msg-en"
                value={messageEn}
                onChange={(e) => setMessageEn(e.target.value)}
                placeholder="Get 15% off this weekend! Use code WEEKEND15 at checkout."
                rows={3}
                maxLength={480}
                className="resize-none"
              />
              <p className="mt-1 text-right text-[10px] text-muted-foreground">
                {messageEn.length} chars · {Math.ceil(messageEn.length / 160) || 1} SMS
              </p>
            </div>
          )}
          {(language === "rw" || language === "both") && (
            <div>
              <Label htmlFor="msg-rw" className="text-xs">
                🇷🇼 Kinyarwanda message
              </Label>
              <Textarea
                id="msg-rw"
                value={messageRw}
                onChange={(e) => setMessageRw(e.target.value)}
                placeholder="Hema 15% mu cyumweru! Koresha kode WEEKEND15."
                rows={3}
                maxLength={480}
                className="resize-none"
              />
              <p className="mt-1 text-right text-[10px] text-muted-foreground">
                {messageRw.length} chars · {Math.ceil(messageRw.length / 160) || 1} SMS
              </p>
            </div>
          )}

          {/* Final message preview */}
          {finalMessage && (
            <div className="rounded-lg bg-secondary/30 p-3">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Preview (with coupon suffix if attached)
              </p>
              <p className="text-sm">{finalMessage}</p>
            </div>
          )}

          {/* Schedule + cost estimate */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="camp-date">Send at</Label>
              <Input
                id="camp-date"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
            <div className="rounded-lg border bg-secondary/20 p-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Cost estimate
              </p>
              <div className="mt-1 space-y-0.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recipients</span>
                  <span className="font-medium">{audience.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SMS per recipient</span>
                  <span className="font-medium">
                    {language === "both" ? `${segments} × 2` : segments}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total SMS</span>
                  <span className="font-medium">{totalSmsCount}</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="text-muted-foreground">Est. cost (@{SMS_COST_PER_SEGMENT} RWF/seg)</span>
                  <span className="font-bold text-primary">{formatRWF(estimatedCost)}</span>
                </div>
              </div>
            </div>
          </div>

          <Button onClick={handleSchedule} disabled={scheduling} className="w-full">
            {scheduling ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Clock className="mr-2 h-4 w-4" />
            )}
            Schedule campaign
          </Button>
        </div>
      </div>

      {/* Scheduled campaigns list */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Clock className="h-5 w-5 text-primary" /> Scheduled campaigns
          </h3>
          <Button variant="ghost" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        {loading ? (
          <Skeleton className="h-20 w-full" />
        ) : campaigns.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No scheduled campaigns yet. Use the form above to create one.
          </p>
        ) : (
          <div className="space-y-2">
            {campaigns.map((c) => (
              <div key={c.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{c.name}</p>
                      <Badge
                        variant={
                          c.status === "sent" ? "default" :
                          c.status === "cancelled" ? "destructive" :
                          "secondary"
                        }
                        className="text-[10px]"
                      >
                        {c.status}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.message}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                      <span>
                        <Users className="mr-1 inline h-3 w-3" />
                        {c.recipients.length} recipients
                      </span>
                      <span>
                        <Calendar className="mr-1 inline h-3 w-3" />
                        {new Date(c.scheduledAt).toLocaleString("en-RW", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {c.sentCount !== undefined && (
                        <span className="text-emerald-600">
                          <CheckCircle2 className="mr-1 inline h-3 w-3" />
                          Sent to {c.sentCount}
                        </span>
                      )}
                    </div>
                  </div>
                  {c.status === "scheduled" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      title="Cancel campaign"
                      onClick={() => cancelCampaign(c.id)}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Share Coupon via SMS modal
// ============================================================================

function ShareCouponModal({
  coupon,
  onClose,
  onSent,
}: {
  coupon: Coupon
  onClose: () => void
  onSent: () => void
}) {
  const { toast } = useToast()
  const [phone, setPhone] = useState("")
  const [sending, setSending] = useState(false)

  const message = `🎁 Your code ${coupon.code} gives you ${formatDiscount(coupon)} on your next FreedomCosmeticShop order! Use it at checkout. Valid while supplies last.`

  const handleSend = async () => {
    if (!phone) {
      toast({ title: "Phone is required", variant: "destructive" })
      return
    }
    setSending(true)
    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: phone, message, templateKey: "PROMOTIONAL" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Send failed")
      toast({ title: "Coupon shared via SMS", description: `To ${phone}` })
      onSent()
    } catch (e) {
      toast({
        title: "Send failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            Share coupon via SMS
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg bg-secondary/30 p-3 text-sm">
            <p className="font-mono font-semibold">{coupon.code}</p>
            <p className="text-xs text-muted-foreground">{formatDiscount(coupon)}</p>
          </div>
          <div>
            <Label htmlFor="share-phone">Recipient phone</Label>
            <Input
              id="share-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0788123456"
            />
          </div>
          <div>
            <Label htmlFor="share-msg">Message</Label>
            <Textarea
              id="share-msg"
              value={message}
              readOnly
              rows={3}
              className="resize-none bg-secondary/20"
            />
            <p className="mt-1 text-right text-[10px] text-muted-foreground">
              {message.length} chars · {Math.ceil(message.length / 160) || 1} SMS
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSend}
              disabled={sending || !phone}
            >
              {sending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send SMS
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
