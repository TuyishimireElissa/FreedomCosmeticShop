"use client"

/**
 * AdminProductManager — full CRUD for products.
 *
 * Features:
 *   - Searchable product table (name, price, stock, status)
 *   - Create / Edit modal with all fields (name, price, stock, brand, category,
 *     images, skinType, shades, ingredients, etc.)
 *   - Delete (soft delete) with confirmation
 *   - Stock management (quick edit stock + isActive)
 *   - Image URL input (Cloudinary integration via /api/upload in future)
 *   - Bulk actions placeholder (CSV import can be added later)
 *
 * Requires ADMIN role (enforced by /api/admin/products).
 */

import { useEffect, useState, useCallback } from "react"
import { Product, Category, Brand } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
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
import { useToast } from "@/hooks/use-toast"
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Package,
  Loader2,
  X,
  ImagePlus,
  Copy,
  Download,
} from "lucide-react"

interface AdminProductManagerProps {
  onStatsUpdate?: () => void
}

interface ProductFormState {
  id?: string
  name: string
  shortDescription: string
  description: string
  price: string
  compareAt: string
  stock: string
  sku: string
  categoryId: string
  brandId: string
  images: string[]
  newImageUrl: string
  skinType: string[]
  shades: string[]
  newShade: string
  ingredients: string[]
  newIngredient: string
  size: string
  usageInstructions: string
  warnings: string
  featured: boolean
  isActive: boolean
}

const EMPTY_FORM: ProductFormState = {
  name: "",
  shortDescription: "",
  description: "",
  price: "",
  compareAt: "",
  stock: "0",
  sku: "",
  categoryId: "",
  brandId: "",
  images: [],
  newImageUrl: "",
  skinType: [],
  shades: [],
  newShade: "",
  ingredients: [],
  newIngredient: "",
  size: "",
  usageInstructions: "",
  warnings: "",
  featured: false,
  isActive: true,
}

export function AdminProductManager({ onStatsUpdate }: AdminProductManagerProps) {
  const { toast } = useToast()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  // NEW: Filter state
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [brandFilter, setBrandFilter] = useState("all")
  const [stockFilter, setStockFilter] = useState("all")

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Load categories + brands once
  useEffect(() => {
    Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/brands").then((r) => r.json()),
    ])
      .then(([cats, brs]) => {
        setCategories(cats.categories || [])
        setBrands(brs.brands || [])
      })
      .catch((e) => console.error(e))
  }, [])

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      params.set("pageSize", "100")
      const res = await fetch(`/api/admin/products?${params.toString()}`)
      if (res.status === 401 || res.status === 403) {
        toast({
          title: "Access denied",
          description: "You need admin access to manage products.",
          variant: "destructive",
        })
        return
      }
      const data = await res.json()
      setProducts(data.products || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [search, toast])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const openCreate = () => {
    setForm({
      ...EMPTY_FORM,
      categoryId: categories[0]?.id || "",
    })
    setShowForm(true)
  }

  const openEdit = (product: Product) => {
    setForm({
      id: product.id,
      name: product.name,
      shortDescription: product.shortDescription || "",
      description: product.description,
      price: String(product.price),
      compareAt: product.compareAt ? String(product.compareAt) : "",
      stock: String(product.stock),
      sku: product.sku || "",
      categoryId: product.categoryId,
      brandId: product.brandId || "",
      images: product.images || [],
      newImageUrl: "",
      skinType: product.skinType || [],
      shades: product.shades || [],
      newShade: "",
      ingredients: product.ingredients || [],
      newIngredient: "",
      size: product.size || "",
      usageInstructions: product.usageInstructions || "",
      warnings: product.warnings || "",
      featured: product.featured,
      isActive: product.isActive,
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.description || !form.price || !form.categoryId) {
      toast({
        title: "Missing fields",
        description: "Name, description, price, and category are required.",
        variant: "destructive",
      })
      return
    }
    if (form.images.length === 0) {
      toast({
        title: "Image required",
        description: "Please add at least one product image URL.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name,
        shortDescription: form.shortDescription || null,
        description: form.description,
        price: Number(form.price),
        compareAt: form.compareAt ? Number(form.compareAt) : null,
        stock: Number(form.stock) || 0,
        sku: form.sku || null,
        categoryId: form.categoryId,
        brandId: form.brandId || null,
        images: form.images,
        skinType: form.skinType.length ? form.skinType : null,
        shades: form.shades.length ? form.shades : null,
        ingredients: form.ingredients.length ? form.ingredients : null,
        size: form.size || null,
        usageInstructions: form.usageInstructions || null,
        warnings: form.warnings || null,
        featured: form.featured,
        isActive: form.isActive,
      }

      const url = form.id
        ? `/api/admin/products/${form.id}`
        : "/api/admin/products"
      const method = form.id ? "PUT" : "POST"

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
        title: form.id ? "Product updated" : "Product created",
        description: form.name,
      })
      setShowForm(false)
      loadProducts()
      onStatsUpdate?.()
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
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/products/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Delete failed")
      toast({ title: "Product deleted", description: deleteTarget.name })
      setDeleteTarget(null)
      loadProducts()
      onStatsUpdate?.()
    } catch (e) {
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  // Quick stock toggle
  const toggleActive = async (product: Product) => {
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !product.isActive }),
      })
      if (!res.ok) throw new Error("Update failed")
      toast({
        title: product.isActive ? "Product deactivated" : "Product activated",
        description: product.name,
      })
      loadProducts()
    } catch (e) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    }
  }

  // NEW: Duplicate a product (opens create form pre-filled with product data)
  const handleDuplicate = (product: Product) => {
    setForm({
      name: `${product.name} (Copy)`,
      shortDescription: product.shortDescription || "",
      description: product.description,
      price: String(product.price),
      compareAt: product.compareAt ? String(product.compareAt) : "",
      stock: String(product.stock),
      sku: product.sku || "",
      categoryId: product.categoryId,
      brandId: product.brandId || "",
      images: product.images || [],
      newImageUrl: "",
      skinType: product.skinType || [],
      shades: product.shades || [],
      newShade: "",
      ingredients: product.ingredients || [],
      newIngredient: "",
      size: product.size || "",
      usageInstructions: product.usageInstructions || "",
      warnings: product.warnings || "",
      featured: product.featured,
      isActive: true,
    })
    setShowForm(true)
    toast({ title: "Product duplicated", description: "Edit and save the copy." })
  }

  // NEW: Export products to CSV
  const handleExportCSV = () => {
    const headers = ["Name", "SKU", "Category", "Brand", "Price (RWF)", "Compare At", "Stock", "Status", "Featured"]
    const rows = filteredProducts.map((p) => [
      `"${p.name}"`,
      p.sku || "",
      p.category?.name || "",
      p.brand?.name || "",
      p.price,
      p.compareAt || "",
      p.stock,
      p.isActive ? "Active" : "Inactive",
      p.featured ? "Yes" : "No",
    ])
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `products-export-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Exported", description: `${filteredProducts.length} products exported to CSV` })
  }

  // NEW: Apply filters to products
  const filteredProducts = products.filter((p) => {
    if (categoryFilter !== "all" && p.categoryId !== categoryFilter) return false
    if (brandFilter !== "all" && p.brandId !== brandFilter) return false
    if (stockFilter === "in" && p.stock <= 5) return false
    if (stockFilter === "low" && (p.stock === 0 || p.stock > 5)) return false
    if (stockFilter === "out" && p.stock !== 0) return false
    return true
  })

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Products</h2>
          <p className="text-sm text-muted-foreground">
            {products.length} product{products.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {/* NEW: Export CSV button */}
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="mr-1.5 h-4 w-4" /> Export
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" /> Add product
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products by name, SKU, or brand..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-9"
          />
        </div>
        {/* NEW: Category filter */}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-10 w-[140px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* NEW: Brand filter */}
        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="h-10 w-[140px]">
            <SelectValue placeholder="All brands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All brands</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* NEW: Stock status filter */}
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="h-10 w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stock</SelectItem>
            <SelectItem value="in">In stock</SelectItem>
            <SelectItem value="low">Low stock</SelectItem>
            <SelectItem value="out">Out of stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border bg-card">
        {loading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="grid place-items-center py-16 text-center">
            <Package className="h-10 w-10 text-muted-foreground/40" />
            <h3 className="mt-3 font-semibold">No products</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Click &ldquo;Add product&rdquo; to create your first product.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 text-left font-medium">Product</th>
                  <th className="px-3 py-3 text-left font-medium">Category</th>
                  <th className="px-3 py-3 text-right font-medium">Price</th>
                  <th className="px-3 py-3 text-right font-medium">Stock</th>
                  <th className="px-3 py-3 text-left font-medium">Status</th>
                  <th className="px-3 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-secondary/20">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-secondary/30">
                          {p.images[0] && (
                            <img
                              src={p.images[0]}
                              alt={p.name}
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="line-clamp-1 font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.brand?.name || "No brand"}
                            {p.featured && " · ★ Featured"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs">{p.category?.name || "—"}</td>
                    <td className="px-3 py-3 text-right font-medium">
                      RWF {p.price.toLocaleString()}
                      {p.compareAt && (
                        <p className="text-xs text-muted-foreground line-through">
                          RWF {p.compareAt.toLocaleString()}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span
                        className={
                          p.stock === 0
                            ? "text-destructive"
                            : p.stock <= 5
                            ? "text-amber-600"
                            : ""
                        }
                      >
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <button onClick={() => toggleActive(p)}>
                        <Badge
                          variant={p.isActive ? "default" : "secondary"}
                          className="cursor-pointer"
                        >
                          {p.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(p)}
                          aria-label={`Edit ${p.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {/* NEW: Duplicate action */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDuplicate(p)}
                          aria-label={`Duplicate ${p.name}`}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget(p)}
                          aria-label={`Delete ${p.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit product" : "Add product"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <Label htmlFor="p-name">Name *</Label>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Vitamin C Brightening Serum"
              />
            </div>

            {/* Short description */}
            <div>
              <Label htmlFor="p-short">Short description (for cards)</Label>
              <Input
                id="p-short"
                value={form.shortDescription}
                onChange={(e) =>
                  setForm({ ...form, shortDescription: e.target.value })
                }
                placeholder="e.g. 15% Vitamin C serum for bright skin."
                maxLength={300}
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="p-desc">Full description *</Label>
              <Textarea
                id="p-desc"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={4}
                placeholder="Detailed product description..."
              />
            </div>

            {/* Price + Compare + Stock */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="p-price">Price (RWF) *</Label>
                <Input
                  id="p-price"
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="12500"
                />
              </div>
              <div>
                <Label htmlFor="p-compare">Compare at (RWF)</Label>
                <Input
                  id="p-compare"
                  type="number"
                  value={form.compareAt}
                  onChange={(e) =>
                    setForm({ ...form, compareAt: e.target.value })
                  }
                  placeholder="16000"
                />
              </div>
              <div>
                <Label htmlFor="p-stock">Stock</Label>
                <Input
                  id="p-stock"
                  type="number"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  placeholder="48"
                />
              </div>
            </div>

            {/* Category + Brand + SKU */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label>Category *</Label>
                <Select
                  value={form.categoryId}
                  onValueChange={(v) => setForm({ ...form, categoryId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Brand</Label>
                <Select
                  value={form.brandId}
                  onValueChange={(v) => setForm({ ...form, brandId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="p-sku">SKU</Label>
                <Input
                  id="p-sku"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  placeholder="UB-VC-001"
                />
              </div>
            </div>

            {/* Images */}
            <div>
              <Label>Product images *</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  type="url"
                  value={form.newImageUrl}
                  onChange={(e) =>
                    setForm({ ...form, newImageUrl: e.target.value })
                  }
                  placeholder="https://images.unsplash.com/..."
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (form.newImageUrl) {
                      setForm({
                        ...form,
                        images: [...form.images, form.newImageUrl],
                        newImageUrl: "",
                      })
                    }
                  }}
                >
                  <ImagePlus className="h-4 w-4" />
                </Button>
              </div>
              {form.images.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {form.images.map((img, i) => (
                    <div
                      key={i}
                      className="relative h-16 w-16 overflow-hidden rounded-md border"
                    >
                      <img
                        src={img}
                        alt={`Product ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            images: form.images.filter((_, idx) => idx !== i),
                          })
                        }
                        className="absolute right-0 top-0 rounded-bl-md bg-destructive/80 px-1 text-white"
                        aria-label="Remove image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Paste image URLs. In production, integrate Cloudinary upload.
              </p>
            </div>

            {/* Skin type */}
            <div>
              <Label>Skin type</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {["ALL", "OILY", "DRY", "COMBINATION", "SENSITIVE", "NORMAL"].map(
                  (st) => (
                    <label
                      key={st}
                      className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm ${
                        form.skinType.includes(st)
                          ? "border-primary bg-primary/5"
                          : ""
                      }`}
                    >
                      <Checkbox
                        checked={form.skinType.includes(st)}
                        onCheckedChange={(v) => {
                          if (v) {
                            setForm({ ...form, skinType: [...form.skinType, st] })
                          } else {
                            setForm({
                              ...form,
                              skinType: form.skinType.filter((s) => s !== st),
                            })
                          }
                        }}
                      />
                      {st.charAt(0) + st.slice(1).toLowerCase()}
                    </label>
                  )
                )}
              </div>
            </div>

            {/* Shades */}
            <div>
              <Label>Shades (for makeup)</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  value={form.newShade}
                  onChange={(e) => setForm({ ...form, newShade: e.target.value })}
                  placeholder="e.g. Deep"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      if (form.newShade) {
                        setForm({
                          ...form,
                          shades: [...form.shades, form.newShade],
                          newShade: "",
                        })
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (form.newShade) {
                      setForm({
                        ...form,
                        shades: [...form.shades, form.newShade],
                        newShade: "",
                      })
                    }
                  }}
                >
                  Add
                </Button>
              </div>
              {form.shades.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {form.shades.map((s, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            shades: form.shades.filter((_, idx) => idx !== i),
                          })
                        }
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Ingredients */}
            <div>
              <Label>Key ingredients</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  value={form.newIngredient}
                  onChange={(e) =>
                    setForm({ ...form, newIngredient: e.target.value })
                  }
                  placeholder="e.g. Vitamin C"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      if (form.newIngredient) {
                        setForm({
                          ...form,
                          ingredients: [...form.ingredients, form.newIngredient],
                          newIngredient: "",
                        })
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (form.newIngredient) {
                      setForm({
                        ...form,
                        ingredients: [...form.ingredients, form.newIngredient],
                        newIngredient: "",
                      })
                    }
                  }}
                >
                  Add
                </Button>
              </div>
              {form.ingredients.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {form.ingredients.map((ing, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs"
                    >
                      {ing}
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            ingredients: form.ingredients.filter(
                              (_, idx) => idx !== i
                            ),
                          })
                        }
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Size + usage + warnings */}
            <div>
              <Label htmlFor="p-size">Size</Label>
              <Input
                id="p-size"
                value={form.size}
                onChange={(e) => setForm({ ...form, size: e.target.value })}
                placeholder="e.g. 30ml"
              />
            </div>
            <div>
              <Label htmlFor="p-usage">How to use</Label>
              <Textarea
                id="p-usage"
                value={form.usageInstructions}
                onChange={(e) =>
                  setForm({ ...form, usageInstructions: e.target.value })
                }
                rows={2}
                placeholder="Apply 3-4 drops every morning..."
              />
            </div>
            <div>
              <Label htmlFor="p-warnings">Warnings / cautions</Label>
              <Textarea
                id="p-warnings"
                value={form.warnings}
                onChange={(e) => setForm({ ...form, warnings: e.target.value })}
                rows={2}
                placeholder="Patch test before use. Avoid contact with eyes."
              />
            </div>

            {/* Flags */}
            <div className="flex flex-wrap gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={form.featured}
                  onCheckedChange={(v) => setForm({ ...form, featured: v === true })}
                />
                <span className="text-sm">Featured product</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm({ ...form, isActive: v === true })}
                />
                <span className="text-sm">Active (visible in store)</span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {form.id ? "Save changes" : "Create product"}
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
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete <strong>{deleteTarget?.name}</strong>. The
              product will be hidden from the store but kept in the database.
              This action cannot be undone from the UI.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
