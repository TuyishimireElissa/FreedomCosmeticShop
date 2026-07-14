"use client"

/**
 * AdminStaff — Section 11: Staff & Security.
 *
 * Tabs:
 *   1. Staff      — list staff users (ADMIN/STAFF/MANAGER), create new staff,
 *                   edit role/department/position/permissions, activate/deactivate,
 *                   reset password
 *   2. Activity   — audit log feed with action/severity/search filters
 *   3. Security   — security overview cards (24h logins, failed attempts, recent
 *                   login users, severity breakdown, recent critical events)
 *
 * APIs:
 *   GET    /api/admin/staff
 *   POST   /api/admin/staff
 *   PATCH  /api/admin/staff/:id
 *   GET    /api/admin/activity-log?action=&severity=&page=&pageSize=&search=
 */

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { useToast } from "@/hooks/use-toast"
import {
  Shield,
  UserPlus,
  UserCog,
  Lock,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  KeyRound,
  Search,
  RefreshCw,
  Loader2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Clock,
  LogIn,
} from "lucide-react"

// ============================================================================
// Types
// ============================================================================

interface StaffProfile {
  id: string
  employeeId: string
  department: string
  position: string
  permissions: string
  isActive: boolean
  hireDate: string
}

interface StaffUser {
  id: string
  name: string
  phone: string
  email: string | null
  role: string
  avatar: string | null
  createdAt: string
  staffProfile: StaffProfile | null
}

interface ActivityLogEntry {
  id: string
  userId: string | null
  userName: string | null
  userRole: string | null
  action: string
  entityType: string | null
  entityId: string | null
  description: string | null
  ipAddress: string | null
  userAgent: string | null
  severity: string
  createdAt: string
}

interface ActivityStats {
  total: number
  infoCount: number
  warnCount: number
  criticalCount: number
  failedLogins24h: number
  successfulLogins24h: number
  recentLoginUsers: {
    userId: string | null
    userName: string | null
    userRole: string | null
    createdAt: string
  }[]
}

// ============================================================================
// Constants — permission matrix
// ============================================================================

const PERMISSION_GROUPS: { label: string; permissions: { key: string; label: string }[] }[] = [
  {
    label: "Orders",
    permissions: [
      { key: "orders.read", label: "View orders" },
      { key: "orders.update", label: "Update order status" },
      { key: "orders.refund", label: "Process refunds" },
    ],
  },
  {
    label: "Products",
    permissions: [
      { key: "products.read", label: "View products" },
      { key: "products.update", label: "Edit products" },
      { key: "products.crud", label: "Full CRUD (create/delete)" },
    ],
  },
  {
    label: "Customers",
    permissions: [
      { key: "customers.read", label: "View customers" },
      { key: "customers.update", label: "Edit customers" },
      { key: "customers.crud", label: "Full CRUD (block/delete)" },
    ],
  },
  {
    label: "Deliveries",
    permissions: [
      { key: "deliveries.read", label: "View deliveries" },
      { key: "deliveries.update", label: "Assign riders / update status" },
      { key: "deliveries.crud", label: "Full CRUD" },
    ],
  },
  {
    label: "Marketing",
    permissions: [
      { key: "coupons.read", label: "View coupons" },
      { key: "coupons.update", label: "Edit coupons" },
      { key: "coupons.crud", label: "Full coupon CRUD" },
      { key: "banners.read", label: "View banners" },
      { key: "banners.update", label: "Edit banners" },
      { key: "banners.crud", label: "Full banner CRUD" },
    ],
  },
  {
    label: "Communications",
    permissions: [
      { key: "sms.send", label: "Send SMS" },
      { key: "sms.schedule", label: "Schedule SMS campaigns" },
    ],
  },
  {
    label: "Insights",
    permissions: [
      { key: "analytics.read", label: "View analytics" },
      { key: "reports.read", label: "View reports + export" },
    ],
  },
  {
    label: "Administration",
    permissions: [
      { key: "staff.manage", label: "Manage staff accounts" },
      { key: "settings.update", label: "Update store settings" },
    ],
  },
]

const ROLE_DEFAULTS: Record<string, string[]> = {
  ADMIN: PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key)),
  MANAGER: [
    "orders.read", "orders.update",
    "products.read", "products.update",
    "customers.read", "customers.update",
    "deliveries.read", "deliveries.update",
    "coupons.read", "coupons.update",
    "banners.read", "banners.update",
    "sms.send", "analytics.read", "reports.read",
  ],
  STAFF: [
    "orders.read", "orders.update",
    "products.read",
    "customers.read",
    "deliveries.read", "deliveries.update",
    "sms.send", "analytics.read",
  ],
}

const DEPARTMENTS = ["SALES", "MARKETING", "LOGISTICS", "SUPPORT", "FINANCE", "MANAGEMENT"] as const

const ROLE_BADGES: Record<string, { label: string; class: string; icon: string }> = {
  ADMIN: { label: "Admin", class: "bg-rose-100 text-rose-700 border-rose-200", icon: "👑" },
  MANAGER: { label: "Manager", class: "bg-violet-100 text-violet-700 border-violet-200", icon: "🛡️" },
  STAFF: { label: "Staff", class: "bg-sky-100 text-sky-700 border-sky-200", icon: "👤" },
}

const SEVERITY_BADGES: Record<string, { label: string; class: string }> = {
  info: { label: "Info", class: "bg-slate-100 text-slate-700" },
  warn: { label: "Warning", class: "bg-amber-100 text-amber-700" },
  critical: { label: "Critical", class: "bg-red-100 text-red-700" },
}

const ACTION_LABELS: Record<string, string> = {
  AUTH_LOGIN: "Login",
  AUTH_LOGOUT: "Logout",
  AUTH_FAILED: "Failed login",
  ORDER_UPDATE: "Order update",
  PAYMENT_REFUND: "Refund",
  CUSTOMER_BLOCK: "Block customer",
  CUSTOMER_UNBLOCK: "Unblock customer",
  COUPON_CREATE: "Create coupon",
  COUPON_UPDATE: "Update coupon",
  COUPON_DELETE: "Delete coupon",
  BANNER_CREATE: "Create banner",
  BANNER_UPDATE: "Update banner",
  BANNER_DELETE: "Delete banner",
  PRODUCT_CREATE: "Create product",
  PRODUCT_UPDATE: "Update product",
  PRODUCT_DELETE: "Delete product",
  DELIVERY_ASSIGN: "Assign rider",
  DELIVERY_UPDATE: "Update delivery",
  SMS_SEND: "Send SMS",
  SETTINGS_UPDATE: "Update settings",
  STAFF_CREATE: "Create staff",
  STAFF_UPDATE: "Update staff",
}

// ============================================================================
// Main component
// ============================================================================

export function AdminStaff() {
  return (
    <div>
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Shield className="h-5 w-5 text-primary" />
          Staff & Security
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage staff accounts, permissions, and audit trail.
        </p>
      </div>

      <Tabs defaultValue="staff">
        <TabsList className="mb-4 grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="staff" className="gap-1">
            <UserCog className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Staff</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1">
            <Activity className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Activity Log</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1">
            <Lock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff">
          <StaffTab />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityTab />
        </TabsContent>
        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================================================
// Staff Tab — list, create, edit
// ============================================================================

function StaffTab() {
  const { toast } = useToast()
  const [staff, setStaff] = useState<StaffUser[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<StaffUser | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Create form
  const [createForm, setCreateForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    role: "STAFF" as "ADMIN" | "STAFF" | "MANAGER",
    department: "SALES" as typeof DEPARTMENTS[number],
    position: "",
  })
  const [showPassword, setShowPassword] = useState(false)

  // Edit form
  const [editForm, setEditForm] = useState({
    role: "STAFF" as "ADMIN" | "STAFF" | "MANAGER",
    department: "SALES" as typeof DEPARTMENTS[number],
    position: "",
    isActive: true,
    permissions: [] as string[],
    resetPassword: "",
  })
  const [showResetPassword, setShowResetPassword] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/staff")
      if (res.status === 401 || res.status === 403) return
      const data = await res.json()
      setStaff(data.staff || [])
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
    setCreateForm({
      name: "",
      phone: "",
      email: "",
      password: "",
      role: "STAFF",
      department: "SALES",
      position: "",
    })
    setShowPassword(false)
    setCreateOpen(true)
  }

  const handleCreate = async () => {
    if (!createForm.name || !createForm.phone || !createForm.password || !createForm.position) {
      toast({ title: "Name, phone, password, and position are required", variant: "destructive" })
      return
    }
    if (createForm.password.length < 12 || !/[a-z]/.test(createForm.password) || !/[A-Z]/.test(createForm.password) || !/\d/.test(createForm.password) || !/[^A-Za-z0-9]/.test(createForm.password)) {
      toast({ title: "Use a stronger temporary password", description: "At least 12 characters with uppercase, lowercase, number, and symbol.", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createForm,
          email: createForm.email || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Create failed")
      toast({
        title: "Staff account created",
        description: `${createForm.name} · ${data.employeeId}`,
      })
      setCreateOpen(false)
      load()
    } catch (e) {
      toast({
        title: "Create failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (s: StaffUser) => {
    setEditing(s)
    let perms: string[] = []
    try {
      perms = s.staffProfile ? JSON.parse(s.staffProfile.permissions) : []
    } catch {
      perms = []
    }
    setEditForm({
      role: s.role as "ADMIN" | "STAFF" | "MANAGER",
      department: (s.staffProfile?.department as typeof DEPARTMENTS[number]) || "SALES",
      position: s.staffProfile?.position || "",
      isActive: s.staffProfile?.isActive ?? true,
      permissions: perms,
      resetPassword: "",
    })
    setShowResetPassword(false)
    setEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editing) return
    if (editForm.resetPassword && (editForm.resetPassword.length < 12 || !/[a-z]/.test(editForm.resetPassword) || !/[A-Z]/.test(editForm.resetPassword) || !/\d/.test(editForm.resetPassword) || !/[^A-Za-z0-9]/.test(editForm.resetPassword))) {
      toast({ title: "Use a stronger temporary password", description: "At least 12 characters with uppercase, lowercase, number, and symbol.", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        role: editForm.role,
        department: editForm.department,
        position: editForm.position,
        isActive: editForm.isActive,
        permissions: editForm.permissions,
      }
      if (editForm.resetPassword) {
        body.resetPassword = editForm.resetPassword
      }
      const res = await fetch(`/api/admin/staff/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Update failed")
      toast({
        title: "Staff updated",
        description: editing.name,
      })
      setEditOpen(false)
      load()
    } catch (e) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const togglePermission = (key: string) => {
    setEditForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter((p) => p !== key)
        : [...prev.permissions, key],
    }))
  }

  const applyRoleDefaults = (role: "ADMIN" | "STAFF" | "MANAGER") => {
    setEditForm((prev) => ({
      ...prev,
      role,
      permissions: ROLE_DEFAULTS[role] || [],
    }))
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
          {staff.length} staff account{staff.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={openCreate}>
          <UserPlus className="mr-1.5 h-4 w-4" /> Add staff
        </Button>
      </div>

      {staff.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-12 text-center">
          <UserCog className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <h3 className="mt-3 font-semibold">No staff accounts yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add staff members to delegate operational tasks.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {staff.map((s) => {
            const roleBadge = ROLE_BADGES[s.role] || ROLE_BADGES.STAFF
            let perms: string[] = []
            try {
              perms = s.staffProfile ? JSON.parse(s.staffProfile.permissions) : []
            } catch {
              perms = []
            }
            return (
              <div
                key={s.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-sm font-semibold text-primary-foreground">
                  {s.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{s.name}</p>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${roleBadge.class}`}
                    >
                      <span>{roleBadge.icon}</span>
                      {roleBadge.label}
                    </span>
                    {s.staffProfile?.isActive === false && (
                      <Badge variant="secondary" className="text-[10px]">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {s.staffProfile?.position || "No position set"} ·{" "}
                    {s.staffProfile?.department || "No department"} ·{" "}
                    {s.staffProfile?.employeeId || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.phone}
                    {s.email ? ` · ${s.email}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Permissions
                  </p>
                  <p className="text-sm font-bold">{perms.length}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title="Edit"
                  onClick={() => openEdit(s)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* Create staff dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Add staff member
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="s-name">Full name *</Label>
                <Input
                  id="s-name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Eric Mugisha"
                />
              </div>
              <div>
                <Label htmlFor="s-phone">Phone *</Label>
                <Input
                  id="s-phone"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  placeholder="0788123456"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="s-email">Email (optional)</Label>
              <Input
                id="s-email"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="eric@freedomcosmeticshop.rw"
              />
            </div>
            <div>
              <Label htmlFor="s-password">Initial password *</Label>
              <div className="relative">
                <Input
                  id="s-password"
                  type={showPassword ? "text" : "password"}
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="12+ chars, upper/lower, number, symbol"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                The account is forced to change this temporary password after first login. Credentials are sent by SMS only when the production SMS provider is enabled.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="s-role">Role</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(v) => setCreateForm({ ...createForm, role: v as typeof createForm.role })}
                >
                  <SelectTrigger id="s-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STAFF">👤 Staff</SelectItem>
                    <SelectItem value="MANAGER">🛡️ Manager</SelectItem>
                    <SelectItem value="ADMIN">👑 Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="s-dept">Department</Label>
                <Select
                  value={createForm.department}
                  onValueChange={(v) => setCreateForm({ ...createForm, department: v as typeof createForm.department })}
                >
                  <SelectTrigger id="s-dept">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d.charAt(0) + d.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="s-position">Position *</Label>
              <Input
                id="s-position"
                value={createForm.position}
                onChange={(e) => setCreateForm({ ...createForm, position: e.target.value })}
                placeholder="e.g., Sales Associate"
              />
            </div>
            <div className="rounded-lg bg-secondary/30 p-3 text-xs">
              <p className="font-medium">Default permissions for {createForm.role}:</p>
              <p className="mt-1 text-muted-foreground">
                {ROLE_DEFAULTS[createForm.role]?.length || 0} permissions will be auto-assigned.
                You can fine-tune them after creation via Edit.
              </p>
            </div>
            <Button onClick={handleCreate} disabled={saving} className="w-full">
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Create staff account
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit staff dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" />
              Edit: {editing?.name}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              {/* Role + Department + Position + Active */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="e-role">Role</Label>
                  <Select
                    value={editForm.role}
                    onValueChange={(v) => applyRoleDefaults(v as "ADMIN" | "STAFF" | "MANAGER")}
                  >
                    <SelectTrigger id="e-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STAFF">👤 Staff</SelectItem>
                      <SelectItem value="MANAGER">🛡️ Manager</SelectItem>
                      <SelectItem value="ADMIN">👑 Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="e-dept">Department</Label>
                  <Select
                    value={editForm.department}
                    onValueChange={(v) => setEditForm({ ...editForm, department: v as typeof editForm.department })}
                  >
                    <SelectTrigger id="e-dept">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d.charAt(0) + d.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="e-position">Position</Label>
                  <Input
                    id="e-position"
                    value={editForm.position}
                    onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                  />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <Switch
                    checked={editForm.isActive}
                    onCheckedChange={(v) => setEditForm({ ...editForm, isActive: v })}
                  />
                  <Label className="text-sm font-normal">
                    {editForm.isActive ? "Active" : "Inactive"}
                  </Label>
                </div>
              </div>

              {/* Permission matrix */}
              <div className="rounded-lg border p-3">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Permissions ({editForm.permissions.length} selected)
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => applyRoleDefaults(editForm.role)}
                  >
                    Reset to {editForm.role} defaults
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {PERMISSION_GROUPS.map((group) => (
                    <div key={group.label} className="rounded-md bg-secondary/30 p-2">
                      <p className="mb-1.5 text-xs font-semibold">{group.label}</p>
                      <div className="space-y-1">
                        {group.permissions.map((p) => (
                          <label
                            key={p.key}
                            className="flex cursor-pointer items-center gap-2 text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={editForm.permissions.includes(p.key)}
                              onChange={() => togglePermission(p.key)}
                              className="h-3.5 w-3.5 rounded accent-primary"
                            />
                            <span>{p.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reset password */}
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <KeyRound className="h-3.5 w-3.5" />
                    Reset password
                  </p>
                  <Switch
                    checked={showResetPassword}
                    onCheckedChange={setShowResetPassword}
                  />
                </div>
                {showResetPassword && (
                  <div className="mt-2">
                    <Input
                      type="password"
                      value={editForm.resetPassword}
                      onChange={(e) => setEditForm({ ...editForm, resetPassword: e.target.value })}
                      placeholder="12+ chars, upper/lower, number, symbol"
                    />
                    <p className="mt-1 text-[10px] text-amber-600">
                      ⚠️ This will force a password reset for {editing.name}.
                    </p>
                  </div>
                )}
              </div>

              <Button onClick={handleSaveEdit} disabled={saving} className="w-full">
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Save changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================================
// Activity Log Tab
// ============================================================================

function ActivityTab() {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState("all")
  const [severityFilter, setSeverityFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "50",
      })
      if (actionFilter !== "all") params.set("action", actionFilter)
      if (severityFilter !== "all") params.set("severity", severityFilter)
      if (search) params.set("search", search)
      const res = await fetch(`/api/admin/activity-log?${params}`)
      if (res.status === 401 || res.status === 403) return
      const data = await res.json()
      setLogs(data.logs || [])
      setTotalPages(data.pagination?.totalPages || 1)
      setTotal(data.pagination?.total || 0)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [page, actionFilter, severityFilter, search])

  useEffect(() => {
    load()
  }, [load])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [actionFilter, severityFilter, search])

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by description or user name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-9"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="h-10 w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {Object.entries(ACTION_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="h-10 w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            <SelectItem value="info">ℹ️ Info</SelectItem>
            <SelectItem value="warn">⚠️ Warning</SelectItem>
            <SelectItem value="critical">🚨 Critical</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={load}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Logs */}
      <div className="overflow-hidden rounded-2xl border bg-card">
        {loading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="grid place-items-center py-16 text-center">
            <Activity className="h-10 w-10 text-muted-foreground/40" />
            <h3 className="mt-3 font-semibold">No activity logged</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Audit entries will appear here as staff perform actions.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {logs.map((log) => {
              const sev = SEVERITY_BADGES[log.severity] || SEVERITY_BADGES.info
              const isLogin = log.action === "AUTH_LOGIN"
              const isFailed = log.action === "AUTH_FAILED"
              return (
                <div key={log.id} className="flex items-start gap-3 p-3 text-sm hover:bg-secondary/20">
                  <span
                    className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                      isFailed
                        ? "bg-red-100 text-red-600"
                        : isLogin
                        ? "bg-emerald-100 text-emerald-600"
                        : log.severity === "critical"
                        ? "bg-red-100 text-red-600"
                        : log.severity === "warn"
                        ? "bg-amber-100 text-amber-600"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {isFailed ? (
                      <XCircle className="h-3.5 w-3.5" />
                    ) : isLogin ? (
                      <LogIn className="h-3.5 w-3.5" />
                    ) : log.severity === "critical" ? (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    ) : (
                      <Activity className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${sev.class}`}
                      >
                        {sev.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString("en-RW", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {log.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{log.description}</p>
                    )}
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                      {log.userName && (
                        <span>
                          By: <span className="font-medium">{log.userName}</span>
                          {log.userRole ? ` (${log.userRole})` : ""}
                        </span>
                      )}
                      {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                      {log.entityType && (
                        <span>
                          {log.entityType}
                          {log.entityId ? `: ${log.entityId.slice(-8)}` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} of {total}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <span className="flex h-9 items-center px-3 text-sm font-medium">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Security Tab
// ============================================================================

function SecurityTab() {
  const [stats, setStats] = useState<ActivityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [recentCritical, setRecentCritical] = useState<ActivityLogEntry[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [statsRes, criticalRes] = await Promise.all([
        fetch("/api/admin/activity-log?pageSize=1"),
        fetch("/api/admin/activity-log?severity=critical&pageSize=10"),
      ])
      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data.stats)
      }
      if (criticalRes.ok) {
        const data = await criticalRes.json()
        setRecentCritical(data.logs || [])
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

  if (!stats) {
    return <p className="text-sm text-muted-foreground">Failed to load security data.</p>
  }

  return (
    <div className="space-y-4">
      {/* 24h security snapshot */}
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Last 24 hours
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SecCard
            icon={<LogIn className="h-4 w-4 text-emerald-500" />}
            label="Successful logins"
            value={stats.successfulLogins24h.toString()}
            tone="emerald"
          />
          <SecCard
            icon={<XCircle className="h-4 w-4 text-red-500" />}
            label="Failed login attempts"
            value={stats.failedLogins24h.toString()}
            tone={stats.failedLogins24h > 5 ? "red" : "amber"}
          />
          <SecCard
            icon={<Activity className="h-4 w-4 text-sky-500" />}
            label="Total events"
            value={stats.total.toString()}
            tone="sky"
          />
          <SecCard
            icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
            label="Critical events"
            value={stats.criticalCount.toString()}
            tone={stats.criticalCount > 0 ? "red" : "slate"}
          />
        </div>
      </div>

      {/* Severity breakdown */}
      <div className="rounded-2xl border bg-card p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          All-time severity breakdown
        </h3>
        <div className="mt-3 space-y-2">
          {[
            { label: "Info", count: stats.infoCount, class: "bg-slate-400", pct: stats.total > 0 ? (stats.infoCount / stats.total) * 100 : 0 },
            { label: "Warning", count: stats.warnCount, class: "bg-amber-400", pct: stats.total > 0 ? (stats.warnCount / stats.total) * 100 : 0 },
            { label: "Critical", count: stats.criticalCount, class: "bg-red-500", pct: stats.total > 0 ? (stats.criticalCount / stats.total) * 100 : 0 },
          ].map((s) => (
            <div key={s.label}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium">{s.label}</span>
                <span className="text-muted-foreground">
                  {s.count} ({s.pct.toFixed(1)}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full rounded-full ${s.class}`}
                  style={{ width: `${s.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent login users */}
      <div className="rounded-2xl border bg-card p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Clock className="h-4 w-4 text-primary" />
          Recent staff logins (last 24h)
        </h3>
        {stats.recentLoginUsers.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
            No staff logins in the last 24 hours.
          </p>
        ) : (
          <div className="space-y-2">
            {stats.recentLoginUsers.map((u, i) => (
              <div
                key={u.userId || i}
                className="flex items-center gap-3 rounded-lg border p-2"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                  <LogIn className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{u.userName || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{u.userRole || "—"}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(u.createdAt).toLocaleString("en-RW", {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent critical events */}
      <div className="rounded-2xl border bg-card p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          Recent critical events
        </h3>
        {recentCritical.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
            ✅ No critical events recorded. All clear.
          </p>
        ) : (
          <div className="space-y-2">
            {recentCritical.map((log) => (
              <div key={log.id} className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {ACTION_LABELS[log.action] || log.action}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString("en-RW")}
                  </span>
                </div>
                {log.description && (
                  <p className="mt-0.5 text-xs text-red-700">{log.description}</p>
                )}
                {log.userName && (
                  <p className="mt-0.5 text-[10px] text-red-600">
                    By: {log.userName} {log.ipAddress ? `· IP: ${log.ipAddress}` : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security best practices reminder */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
          <Shield className="h-4 w-4" />
          Security recommendations
        </h3>
        <ul className="mt-2 space-y-1.5 text-xs text-amber-800">
          <li className="flex items-start gap-1.5">
            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
            Review failed login spikes — more than 5 failed attempts in 24h may indicate a brute-force attack.
          </li>
          <li className="flex items-start gap-1.5">
            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
            Deactivate staff accounts immediately when an employee leaves. Use the Staff tab → Edit → toggle Active.
          </li>
          <li className="flex items-start gap-1.5">
            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
            Apply the principle of least privilege — assign STAFF role by default and only escalate to MANAGER/ADMIN when needed.
          </li>
          <li className="flex items-start gap-1.5">
            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
            Reset staff passwords periodically via Edit → Reset password. Initial passwords should be changed after first login.
          </li>
        </ul>
      </div>

      {/* Section 11: Permission Matrix Reference */}
      <div className="rounded-2xl border bg-card p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Shield className="h-4 w-4 text-primary" />
          Permission Matrix — Role Access Reference
        </h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Fine-grained permissions are enforced on admin API routes. ADMIN has full access; STAFF/MANAGER
          are limited to their assigned permissions (editable in the Staff tab).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-secondary/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-2 py-2 text-left font-medium">Capability</th>
                <th className="px-2 py-2 text-center font-medium">👑 Admin</th>
                <th className="px-2 py-2 text-center font-medium">🛡️ Manager</th>
                <th className="px-2 py-2 text-center font-medium">👤 Staff</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[
                { cap: "View orders", admin: true, mgr: true, staff: true },
                { cap: "Update order status", admin: true, mgr: true, staff: true },
                { cap: "Process refunds", admin: true, mgr: false, staff: false },
                { cap: "View products", admin: true, mgr: true, staff: true },
                { cap: "Edit products", admin: true, mgr: true, staff: false },
                { cap: "Create/delete products", admin: true, mgr: false, staff: false },
                { cap: "View customers", admin: true, mgr: true, staff: true },
                { cap: "Block/unblock customers", admin: true, mgr: true, staff: false },
                { cap: "Manage deliveries", admin: true, mgr: true, staff: true },
                { cap: "View analytics", admin: true, mgr: true, staff: true },
                { cap: "View reports + export", admin: true, mgr: true, staff: false },
                { cap: "Send SMS", admin: true, mgr: true, staff: true },
                { cap: "Schedule SMS campaigns", admin: true, mgr: false, staff: false },
                { cap: "Manage coupons", admin: true, mgr: true, staff: false },
                { cap: "Manage banners", admin: true, mgr: true, staff: false },
                { cap: "Manage staff accounts", admin: true, mgr: false, staff: false },
                { cap: "Update store settings", admin: true, mgr: false, staff: false },
              ].map((row) => (
                <tr key={row.cap} className="hover:bg-secondary/20">
                  <td className="px-2 py-1.5 font-medium">{row.cap}</td>
                  <td className="px-2 py-1.5 text-center">{row.admin ? "✅" : "—"}</td>
                  <td className="px-2 py-1.5 text-center">{row.mgr ? "✅" : "❌"}</td>
                  <td className="px-2 py-1.5 text-center">{row.staff ? "✅" : "❌"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Rate limiting is also enforced: product updates (60/min), product deletes (10/min),
          order updates (100/min), delivery updates (60/min). Rate-limited requests return HTTP 429.
        </p>
      </div>
    </div>
  )
}

function SecCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone: "emerald" | "red" | "amber" | "sky" | "slate"
}) {
  const toneClasses: Record<string, string> = {
    emerald: "border-emerald-200 bg-emerald-50",
    red: "border-red-200 bg-red-50",
    amber: "border-amber-200 bg-amber-50",
    sky: "border-sky-200 bg-sky-50",
    slate: "border-slate-200 bg-slate-50",
  }
  return (
    <div className={`rounded-2xl border p-4 ${toneClasses[tone]}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  )
}
