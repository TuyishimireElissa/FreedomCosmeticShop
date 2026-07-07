"use client"

/**
 * AdminSettings — manage coupons, banners, and delivery fees.
 *
 * Tabs:
 *   - Coupons: CRUD for discount codes
 *   - Banners: CRUD for promotional banners
 *   - Delivery: View delivery fee structure by province
 */

import { useEffect, useState, useCallback } from "react"
import { formatRWF, DELIVERY_FEES, DELIVERY_TIMES } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
  DialogFooter,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import {
  Plus,
  Pencil,
  Trash2,
  Tag,
  Image as ImageIcon,
  Truck,
  Loader2,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Coupon {
  id: string
  code: string
  description: string | null
  type: string
  value: number
  minOrderAmount: number | null
  maxDiscountAmount: number | null
  usageLimit: number | null
  usageLimitPerUser: number
  usedCount: number
  startsAt: string
  endsAt: string | null
  isActive: boolean
}

interface Banner {
  id: string
  title: string
  subtitle: string | null
  image: string
  mobileImage: string | null
  placement: string
  isActive: boolean
  sortOrder: number
}

export function AdminSettings() {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage coupons, banners, and delivery fees.
        </p>
      </div>

      <Tabs defaultValue="coupons">
        <TabsList className="mb-4 grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="coupons">Coupons</TabsTrigger>
          <TabsTrigger value="banners">Banners</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
        </TabsList>

        <TabsContent value="coupons">
          <CouponsManager />
        </TabsContent>
        <TabsContent value="banners">
          <BannersManager />
        </TabsContent>
        <TabsContent value="delivery">
          <DeliverySettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Coupons Manager ─────────────────────────────────────────────────────────

function CouponsManager() {
  const { toast } = useToast()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Coupon | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    code: "",
    description: "",
    type: "PERCENTAGE" as "PERCENTAGE" | "FIXED" | "FREE_SHIPPING",
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
      console.error("Failed to load")
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
      code: "",
      description: "",
      type: "PERCENTAGE",
      value: "10",
      minOrderAmount: "",
      maxDiscountAmount: "",
      usageLimit: "",
      usageLimitPerUser: "1",
      startsAt: new Date().toISOString().slice(0, 10),
      endsAt: "",
      isActive: true,
    })
    setShowForm(true)
  }

  const openEdit = (coupon: Coupon) => {
    setEditing(coupon)
    setForm({
      code: coupon.code,
      description: coupon.description || "",
      type: coupon.type as "PERCENTAGE" | "FIXED" | "FREE_SHIPPING",
      value: String(coupon.value),
      minOrderAmount: coupon.minOrderAmount ? String(coupon.minOrderAmount) : "",
      maxDiscountAmount: coupon.maxDiscountAmount ? String(coupon.maxDiscountAmount) : "",
      usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : "",
      usageLimitPerUser: String(coupon.usageLimitPerUser),
      startsAt: new Date(coupon.startsAt).toISOString().slice(0, 10),
      endsAt: coupon.endsAt ? new Date(coupon.endsAt).toISOString().slice(0, 10) : "",
      isActive: coupon.isActive,
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
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/admin/coupons/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Delete failed")
      toast({ title: "Coupon deleted", description: deleteTarget.code })
      setDeleteTarget(null)
      load()
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {coupons.length} coupon{coupons.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" /> Add coupon
        </Button>
      </div>

      {coupons.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-12 text-center">
          <Tag className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <h3 className="mt-3 font-semibold">No coupons yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create discount codes to boost sales.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {coupons.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold">{c.code}</span>
                  <Badge variant={c.isActive ? "default" : "secondary"}>
                    {c.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {c.type === "PERCENTAGE"
                    ? `${c.value}% off`
                    : c.type === "FIXED"
                    ? `${formatRWF(c.value)} off`
                    : "Free shipping"}
                  {c.minOrderAmount ? ` · Min ${formatRWF(c.minOrderAmount)}` : ""}
                  {" · "}Used {c.usedCount}
                  {c.usageLimit ? `/${c.usageLimit}` : ""} times
                </p>
                {c.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{c.description}</p>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openEdit(c)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteTarget(c)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form dialog */}
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
              />
            </div>
            <div>
              <Label htmlFor="c-desc">Description</Label>
              <Input
                id="c-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="10% off first order"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as typeof form.type })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                    <SelectItem value="FIXED">Fixed amount</SelectItem>
                    <SelectItem value="FREE_SHIPPING">Free shipping</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="c-value">
                  {form.type === "PERCENTAGE" ? "Percentage (%)" : "Amount (RWF)"}
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
                  placeholder="No limit"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="c-limit">Usage limit</Label>
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
                <Label htmlFor="c-start">Start date</Label>
                <Input
                  id="c-start"
                  type="date"
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="c-end">End date (optional)</Label>
                <Input
                  id="c-end"
                  type="date"
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                />
              </div>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4 rounded"
              />
              <span className="text-sm">Active</span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete coupon?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{deleteTarget?.code}</strong>? This cannot be undone.
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
    </div>
  )
}

// ─── Banners Manager ─────────────────────────────────────────────────────────

function BannersManager() {
  const { toast } = useToast()
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Banner | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    image: "",
    mobileImage: "",
    placement: "HOME_HERO",
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
      console.error("Failed to load")
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
      isActive: true,
      sortOrder: "0",
    })
    setShowForm(true)
  }

  const openEdit = (banner: Banner) => {
    setEditing(banner)
    setForm({
      title: banner.title,
      subtitle: banner.subtitle || "",
      image: banner.image,
      mobileImage: banner.mobileImage || "",
      placement: banner.placement,
      isActive: banner.isActive,
      sortOrder: String(banner.sortOrder),
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
        </div>
      ) : (
        <div className="space-y-2">
          {banners.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-3 rounded-xl border bg-card p-3"
            >
              <div className="h-14 w-20 shrink-0 overflow-hidden rounded bg-secondary/30">
                <img src={b.image} alt={b.title} className="h-full w-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{b.title}</p>
                  <Badge variant={b.isActive ? "default" : "secondary"}>
                    {b.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {b.placement} · Order {b.sortOrder}
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(b)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteTarget(b)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
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
                placeholder="Special offer!"
              />
            </div>
            <div>
              <Label htmlFor="b-sub">Subtitle</Label>
              <Input
                id="b-sub"
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                placeholder="10% off this weekend"
              />
            </div>
            <div>
              <Label htmlFor="b-image">Image URL *</Label>
              <Input
                id="b-image"
                type="url"
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label htmlFor="b-mobile">Mobile image URL (optional)</Label>
              <Input
                id="b-mobile"
                type="url"
                value={form.mobileImage}
                onChange={(e) => setForm({ ...form, mobileImage: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Placement</Label>
                <Select
                  value={form.placement}
                  onValueChange={(v) => setForm({ ...form, placement: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HOME_HERO">Home hero</SelectItem>
                    <SelectItem value="HOME_PROMO">Home promo</SelectItem>
                    <SelectItem value="SIDEBAR">Sidebar</SelectItem>
                    <SelectItem value="CATEGORY_TOP">Category top</SelectItem>
                    <SelectItem value="CHECKOUT_BANNER">Checkout banner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="b-order">Sort order</Label>
                <Input
                  id="b-order"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                />
              </div>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4 rounded"
              />
              <span className="text-sm">Active</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete banner?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{deleteTarget?.title}</strong>?
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
    </div>
  )
}

// ─── Delivery Settings ───────────────────────────────────────────────────────

function DeliverySettings() {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <Truck className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Delivery fees by province</h3>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        These fees are applied automatically based on the customer&apos;s province.
      </p>
      <div className="space-y-2">
        {Object.entries(DELIVERY_FEES).map(([province, fee]) => (
          <div
            key={province}
            className="flex items-center justify-between rounded-xl border p-3"
          >
            <div>
              <p className="font-medium">{province}</p>
              <p className="text-xs text-muted-foreground">{DELIVERY_TIMES[province]}</p>
            </div>
            <span className="text-lg font-bold">{formatRWF(fee)}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
        💡 To change delivery fees, update the{" "}
        <code className="rounded bg-amber-100 px-1">DELIVERY_FEES</code> constant in{" "}
        <code className="rounded bg-amber-100 px-1">src/lib/format.ts</code>
      </p>
    </div>
  )
}
