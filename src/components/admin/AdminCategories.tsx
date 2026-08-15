"use client"

/**
 * AdminCategories — manage the storefront category list.
 *
 * The category API has been complete for a while; nothing in the admin panel
 * ever called it beyond filling a dropdown, so categories could only be changed
 * by a developer running SQL. This is the missing screen.
 *
 * Fetches from:
 *   GET    /api/admin/categories        list, ordered by sortOrder
 *   POST   /api/admin/categories        create
 *   PUT    /api/admin/categories/:id    rename, re-order, show/hide
 *
 * Deliberate choices:
 *   - useState + fetch + useToast, matching every other admin screen. TanStack
 *     Query is installed and its provider is mounted, but no component in this
 *     codebase uses it; this screen is not the place to introduce a second
 *     data-fetching pattern.
 *   - Raw <table> markup. There is no shadcn table primitive here and five
 *     other admin screens hand-roll the same markup.
 *   - Admin chrome is English. Kinyarwanda is the *data* being edited
 *     (nameRw), which is what the storefront renders. That matches the rest of
 *     the panel — the shopper-facing UI is bilingual, the back office is not.
 *   - Hiding a category that still holds products asks for confirmation first.
 *     One tap would otherwise pull 33 soaps off the shop with no undo prompt.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  Eye,
  EyeOff,
  FolderTree,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useCategoryUpdates } from "@/hooks/use-realtime"

interface AdminCategory {
  id: string
  name: string
  nameRw: string | null
  slug: string
  description: string | null
  sortOrder: number
  isActive: boolean
  _count?: { products: number }
}

interface EditState {
  id: string | null
  name: string
  nameRw: string
  description: string
  sortOrder: string
}

const EMPTY_FORM: EditState = { id: null, name: "", nameRw: "", description: "", sortOrder: "" }

const productCount = (category: AdminCategory) => category._count?.products ?? 0

export default function AdminCategories() {
  const { toast } = useToast()
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [form, setForm] = useState<EditState>(EMPTY_FORM)
  const [formOpen, setFormOpen] = useState(false)
  const [confirmHide, setConfirmHide] = useState<AdminCategory | null>(null)

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      const response = await fetch("/api/admin/categories", { cache: "no-store" })
      if (!response.ok) throw new Error(`Request failed (${response.status})`)
      const data = await response.json()
      setCategories(Array.isArray(data.categories) ? data.categories : [])
      setError(null)
    } catch {
      setError("Could not load categories.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Another admin editing categories in a second tab should not leave this
  // list stale. Refetch quietly so the table does not flash a skeleton.
  useCategoryUpdates(
    useCallback(() => {
      void load(true)
    }, [load]),
  )

  const stats = useMemo(() => {
    const active = categories.filter((category) => category.isActive)
    return {
      total: categories.length,
      hidden: categories.length - active.length,
      empty: active.filter((category) => productCount(category) === 0).length,
      products: categories.reduce((sum, category) => sum + productCount(category), 0),
    }
  }, [categories])

  function openCreate() {
    // Sort the new row to the end rather than colliding with an existing slot.
    const nextOrder = categories.reduce((max, category) => Math.max(max, category.sortOrder), 0) + 1
    setForm({ ...EMPTY_FORM, sortOrder: String(nextOrder) })
    setFormOpen(true)
  }

  function openEdit(category: AdminCategory) {
    setForm({
      id: category.id,
      name: category.name,
      nameRw: category.nameRw ?? "",
      description: category.description ?? "",
      sortOrder: String(category.sortOrder),
    })
    setFormOpen(true)
  }

  async function save() {
    const name = form.name.trim()
    if (name.length < 2) {
      toast({ title: "Name must be at least 2 characters", variant: "destructive" })
      return
    }
    const sortOrder = Number.parseInt(form.sortOrder, 10)
    if (!Number.isFinite(sortOrder) || sortOrder < 0) {
      toast({ title: "Order must be a whole number", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const editing = Boolean(form.id)
      const payload = {
        name,
        nameRw: form.nameRw.trim() || null,
        description: form.description.trim() || null,
        sortOrder,
      }
      const response = await fetch(
        editing ? `/api/admin/categories/${form.id}` : "/api/admin/categories",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      )
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || `Request failed (${response.status})`)
      }
      toast({ title: editing ? "Category updated" : "Category created", description: name })
      setFormOpen(false)
      setForm(EMPTY_FORM)
      await load(true)
    } catch (saveError) {
      toast({
        title: "Could not save",
        description: saveError instanceof Error ? saveError.message : undefined,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  async function applyVisibility(category: AdminCategory, isActive: boolean) {
    setTogglingId(category.id)
    // Optimistic: the switch should move under the finger, not after a round trip.
    setCategories((current) =>
      current.map((row) => (row.id === category.id ? { ...row, isActive } : row)),
    )
    try {
      const response = await fetch(`/api/admin/categories/${category.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      })
      if (!response.ok) throw new Error(`Request failed (${response.status})`)
      toast({
        title: isActive ? "Category shown" : "Category hidden",
        description: category.nameRw || category.name,
      })
    } catch {
      // Put it back. A switch that lies about the saved state is worse than none.
      setCategories((current) =>
        current.map((row) => (row.id === category.id ? { ...row, isActive: !isActive } : row)),
      )
      toast({ title: "Could not change visibility", variant: "destructive" })
    } finally {
      setTogglingId(null)
    }
  }

  function requestToggle(category: AdminCategory, next: boolean) {
    // Hiding a stocked category removes real products from the storefront.
    if (!next && productCount(category) > 0) {
      setConfirmHide(category)
      return
    }
    void applyVisibility(category, next)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <FolderTree className="h-5 w-5" aria-hidden="true" />
            Categories
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Order, rename and hide the categories shoppers see. Kinyarwanda names appear on the shop.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" />
            Refresh
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add category
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Categories", value: stats.total },
          { label: "Hidden", value: stats.hidden },
          { label: "Empty", value: stats.empty },
          { label: "Products", value: stats.products },
        ].map((card) => (
          <div key={card.label} className="rounded-lg border bg-card p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold">{card.value}</p>
          </div>
        ))}
      </div>

      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
            {error}
          </span>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-3 text-left font-medium">Order</th>
              <th className="px-3 py-3 text-left font-medium">Name</th>
              <th className="px-3 py-3 text-left font-medium">Slug</th>
              <th className="px-3 py-3 text-center font-medium">Products</th>
              <th className="px-3 py-3 text-center font-medium">Shown</th>
              <th className="px-3 py-3 text-right font-medium">Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <tr key={index}>
                  <td className="px-3 py-3" colSpan={6}>
                    <Skeleton className="h-6 w-full" />
                  </td>
                </tr>
              ))
            ) : categories.length === 0 ? (
              <tr>
                <td className="px-3 py-10 text-center text-muted-foreground" colSpan={6}>
                  No categories yet.
                </td>
              </tr>
            ) : (
              categories.map((category) => {
                const count = productCount(category)
                return (
                  <tr key={category.id} className={category.isActive ? "" : "bg-muted/30"}>
                    <td className="px-3 py-3 tabular-nums text-muted-foreground">{category.sortOrder}</td>
                    <td className="px-3 py-3">
                      <div className="font-medium">{category.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {category.nameRw || <span className="italic">No Kinyarwanda name</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{category.slug}</code>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Badge variant={count > 0 ? "fcs-african" : "secondary"}>{count}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={category.isActive}
                          disabled={togglingId === category.id}
                          onCheckedChange={(next) => requestToggle(category, next)}
                          aria-label={`${category.isActive ? "Hide" : "Show"} ${category.name}`}
                        />
                        {togglingId === category.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden="true" />
                        ) : category.isActive ? (
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(category)}>
                        <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit category" : "Add category"}</DialogTitle>
            <DialogDescription>
              {form.id
                ? "The web address stays the same when you rename, so links already shared keep working."
                : "The web address is created from the English name."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="cat-name">English name *</Label>
              <Input
                id="cat-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Soap"
              />
            </div>
            <div>
              <Label htmlFor="cat-name-rw">Kinyarwanda name</Label>
              <Input
                id="cat-name-rw"
                value={form.nameRw}
                onChange={(event) => setForm((current) => ({ ...current, nameRw: event.target.value }))}
                placeholder="Isabune"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Shown to shoppers using Kinyarwanda. Leave empty to fall back to the English name.
              </p>
            </div>
            <div>
              <Label htmlFor="cat-order">Order *</Label>
              <Input
                id="cat-order"
                inputMode="numeric"
                value={form.sortOrder}
                onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))}
                placeholder="1"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Lower numbers appear first. On phones, categories with products are shown before empty ones.
              </p>
            </div>
            <div>
              <Label htmlFor="cat-description">Description</Label>
              <Textarea
                id="cat-description"
                rows={3}
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  Saving
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(confirmHide)} onOpenChange={(open) => !open && setConfirmHide(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hide this category?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmHide
                ? `${confirmHide.nameRw || confirmHide.name} has ${productCount(confirmHide)} product${productCount(confirmHide) === 1 ? "" : "s"}. Hiding it removes them from the shop. The products are not deleted, and you can show the category again at any time.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmHide) void applyVisibility(confirmHide, false)
                setConfirmHide(null)
              }}
            >
              Hide it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
