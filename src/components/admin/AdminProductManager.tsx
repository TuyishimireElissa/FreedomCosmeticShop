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
 *   - Direct multi-photo Cloudinary uploads from the product form
 *   - Bulk actions placeholder (CSV import can be added later)
 *
 * Requires ADMIN role (enforced by /api/admin/products).
 */

import { useEffect, useState, useCallback, type ChangeEvent, type ClipboardEvent } from "react"
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
import { useT } from '@/lib/i18n/LanguageContext'
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
  Tag,
  AlertTriangle,
} from "lucide-react"
import { WholesalePricingPanel } from "./WholesalePricingPanel"
import { optimizedImageUrl } from "@/lib/cloudinary-images"
import { useStore } from '@/store/useStore'
import { canAdminPermission } from '@/lib/admin-roles'
import { isWholeNumber, parseProductBrief } from '@/lib/product-brief'
import { cleanLatexPaste } from '@/lib/latex-paste'

interface AdminProductManagerProps {
  onStatsUpdate?: () => void
}

interface SupplierOption { id: string; name: string }
interface ProductBatchSummary { id: string; batchNumber: string; quantity: number; expiryDate: string | null; receivedDate: string }
interface AdminProduct extends Product {
  supplierId?: string | null
  supplier?: SupplierOption | null
  realSku?: string | null
  manufacturedDate?: string | null
  expiryDate?: string | null
  batchNumber?: string | null
  profitAmount?: number
  profitMargin?: number
  batches?: ProductBatchSummary[]
}

interface ProductFormState {
  id?: string
  name: string
  shortDescription: string
  description: string
  price: string
  wholesalePrice: string
  compareAt: string
  costPrice: string
  stock: string
  lowStockThreshold: string
  sku: string
  realSku: string
  supplierId: string
  batchNumber: string
  manufacturedDate: string
  expiryDate: string
  periodAfterOpening: string
  volume: string
  categoryId: string
  brandId: string
  images: string[]
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

function getAdminPrimaryImage(product: AdminProduct) {
  return product.productImages?.find((image) => image.isPrimary)?.url || product.productImages?.[0]?.url || product.images?.[0] || ''
}

const EMPTY_FORM: ProductFormState = {
  name: "",
  shortDescription: "",
  description: "",
  price: "",
  wholesalePrice: "",
  compareAt: "",
  costPrice: "",
  stock: "0",
  lowStockThreshold: "5",
  sku: "",
  realSku: "",
  supplierId: "none",
  batchNumber: "",
  manufacturedDate: "",
  expiryDate: "",
  periodAfterOpening: "",
  volume: "",
  categoryId: "",
  brandId: "",
  images: [],
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
  const t = useT()
  const { toast } = useToast()
  const user = useStore((state) => state.user)
  const canCreateProduct = canAdminPermission(user?.role, user?.permissions, 'products.crud')

  const [products, setProducts] = useState<AdminProduct[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [referenceLoading, setReferenceLoading] = useState(true)
  const [referenceError, setReferenceError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [productPage, setProductPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })

  // NEW: Filter state
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [brandFilter, setBrandFilter] = useState("all")
  const [stockFilter, setStockFilter] = useState("all")

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [productBrief, setProductBrief] = useState("")

  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Section 3: Wholesale pricing modal
  const [pricingTarget, setPricingTarget] = useState<AdminProduct | null>(null)
  const [batchTarget, setBatchTarget] = useState<AdminProduct | null>(null)
  const [batchForm, setBatchForm] = useState({ batchNumber: "", quantity: "", manufacturedDate: "", expiryDate: "", supplierInvoice: "", notes: "" })
  const [receivingBatch, setReceivingBatch] = useState(false)
  const [showSupplierForm, setShowSupplierForm] = useState(false)
  const [supplierForm, setSupplierForm] = useState({ name: "", email: "", phone: "", country: "" })
  const [savingSupplier, setSavingSupplier] = useState(false)

  // Load the active references required by the create form.
  const loadReferences = useCallback(async () => {
    setReferenceLoading(true)
    setReferenceError(null)
    try {
      const responses = await Promise.all([
        fetch('/api/admin/categories', { cache: 'no-store' }),
        fetch('/api/admin/brands', { cache: 'no-store' }),
        fetch('/api/admin/suppliers', { cache: 'no-store' }),
      ])
      if (responses.some((response) => response.status === 401)) throw new Error('Your session expired. Sign in again.')
      if (responses.some((response) => response.status === 403)) throw new Error('Your account does not have product-management permission.')
      if (!responses[0].ok) throw new Error('Categories failed to load.')
      if (!responses[1].ok) throw new Error('Brands failed to load.')
      const categoryData = await responses[0].json() as { categories?: Category[] }
      const brandData = await responses[1].json() as { brands?: Brand[] }
      const supplierData = responses[2].ok ? await responses[2].json() as { suppliers?: SupplierOption[] } : {}
      const activeCategories = (categoryData.categories || []).filter((category) => category.isActive)
      const activeBrands = (brandData.brands || []).filter((brand) => brand.isActive)
      setCategories(activeCategories)
      setBrands(activeBrands)
      setSuppliers(supplierData.suppliers || [])
      if (activeCategories.length === 0) setReferenceError('Create or activate at least one category before adding a product.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Product form options failed to load.'
      setReferenceError(message)
      setCategories([])
      setBrands([])
      setSuppliers([])
    } finally {
      setReferenceLoading(false)
    }
  }, [])

  useEffect(() => { void loadReferences() }, [loadReferences])

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      params.set("page", String(productPage))
      params.set("pageSize", "20")
      const res = await fetch(`/api/admin/products?${params.toString()}`)
      if (res.status === 401 || res.status === 403) {
        setLoadError("You need admin access to manage products.")
        setProducts([])
        toast({
          title: "Access denied",
          description: "You need admin access to manage products.",
          variant: "destructive",
        })
        return
      }
      // Any other failure (500, 429, network hiccup) used to fall through and
      // render the "No products" empty state, which wrongly told the owner the
      // catalogue was gone. Surface it instead.
      if (!res.ok) throw new Error(`Server returned ${res.status}`)
      const data = await res.json()
      if (!Array.isArray(data.products)) throw new Error("Unexpected response from the server")
      setLoadError(null)
      setProducts(data.products)
      setPagination({ page: data.pagination?.page || productPage, total: data.pagination?.total || 0, totalPages: Math.max(1, data.pagination?.totalPages || 1) })
    } catch (e) {
      console.error(e)
      setLoadError("Products could not be loaded. Your catalogue is safe — this is a loading problem.")
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [productPage, search, toast])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const openCreate = () => {
    if (!canCreateProduct) {
      toast({ title: 'Create access required', description: 'Ask the store owner for the products.crud permission.', variant: 'destructive' })
      return
    }
    if (referenceLoading || referenceError || categories.length === 0) {
      toast({ title: 'Product form is not ready', description: referenceError || 'Categories are still loading. Try again shortly.', variant: 'destructive' })
      return
    }
    setProductBrief("")
    setForm({ ...EMPTY_FORM, categoryId: categories[0].id })
    setFormError(null)
    setShowForm(true)
  }

  const openEdit = (product: AdminProduct) => {
    setProductBrief("")
    setFormError(null)
    setForm({
      id: product.id,
      name: product.name,
      shortDescription: product.shortDescription || "",
      description: product.description,
      price: String(product.price),
      wholesalePrice: product.wholesalePrice !== null && product.wholesalePrice !== undefined ? String(product.wholesalePrice) : "",
      compareAt: product.compareAt ? String(product.compareAt) : "",
      costPrice: product.costPrice !== null ? String(product.costPrice) : "",
      stock: String(product.stock),
      lowStockThreshold: String(product.lowStockThreshold),
      sku: product.sku || "",
      realSku: product.realSku || "",
      supplierId: product.supplierId || "none",
      batchNumber: product.batchNumber || "",
      manufacturedDate: product.manufacturedDate?.slice(0, 10) || "",
      expiryDate: product.expiryDate?.slice(0, 10) || "",
      periodAfterOpening: product.periodAfterOpening ? String(product.periodAfterOpening) : "",
      volume: product.volume || "",
      categoryId: product.categoryId,
      brandId: product.brandId || "",
      images: product.images || [],
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

  const applyProductBrief = () => {
    if (!productBrief.trim()) return
    const parsed = parseProductBrief(productBrief)
    const categoryParts = parsed.categoryText.split(/[→>/]/).map((part) => part.trim().toLowerCase()).filter(Boolean)
    const matchedCategory = categories.find((category) => categoryParts.some((part) => category.name.toLowerCase() === part || category.slug.toLowerCase() === part.replace(/\s+/g, '-')))
    const normalizedBrand = parsed.brandText.toLowerCase().replace(/[^a-z0-9]/g, '')
    const matchedBrand = brands.find((brand) => brand.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedBrand)
    setForm((current) => ({
      ...current,
      name: parsed.name || current.name,
      shortDescription: parsed.shortDescription || current.shortDescription,
      description: parsed.description || current.description,
      volume: parsed.volume || current.volume,
      sku: parsed.sku || current.sku,
      usageInstructions: parsed.usageInstructions || current.usageInstructions,
      warnings: parsed.warnings || current.warnings,
      skinType: parsed.skinType.length ? parsed.skinType : current.skinType,
      ingredients: parsed.ingredients.length ? parsed.ingredients : current.ingredients,
      price: parsed.price || current.price,
      wholesalePrice: parsed.wholesalePrice || current.wholesalePrice,
      categoryId: matchedCategory?.id || current.categoryId,
      brandId: matchedBrand?.id || current.brandId,
    }))
    const remaining = [
      parsed.priceNeedsExactValue && 'enter one exact retail price',
      parsed.wholesaleNeedsExactValue && 'enter one exact wholesale price',
      parsed.categoryText && !matchedCategory && 'select an existing category',
      parsed.brandText && !matchedBrand && 'select or create the brand',
      /IngredientBenefit/i.test(productBrief) && 'add ingredients individually',
    ].filter(Boolean)
    toast({ title: 'Product brief applied', description: remaining.length ? `Still required: ${remaining.join('; ')}.` : 'Review the fields, add photos, then save.' })
  }

  const uploadPhotoFiles = async (incomingFiles: File[]) => {
    const selectedFiles = incomingFiles.slice(0, Math.max(0, 5 - form.images.length))
    if (selectedFiles.length === 0 || uploadingPhotos) return
    setUploadingPhotos(true)
    try {
      const uploadedUrls: string[] = []
      for (const selectedFile of selectedFiles) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(selectedFile.type)) {
          toast({ title: 'Unsupported image', description: `${selectedFile.name}: use JPG, PNG, or WebP.`, variant: 'destructive' })
          continue
        }
        if (selectedFile.size < 1 || selectedFile.size > 10 * 1024 * 1024) {
          toast({ title: 'Image too large', description: `${selectedFile.name}: maximum size is 10 MB.`, variant: 'destructive' })
          continue
        }
        const body = new FormData()
        body.set('file', selectedFile)
        body.set('folder', 'products')
        const response = await fetch('/api/upload', { method: 'POST', body })
        const result = await response.json().catch(() => ({}))
        const url = result.image?.url || result.data?.image?.url || result.url
        if (!response.ok || typeof url !== 'string') throw new Error(result.error || `Upload failed for ${selectedFile.name}`)
        uploadedUrls.push(url)
      }
      if (uploadedUrls.length > 0) {
        setForm((current) => ({ ...current, images: [...current.images, ...uploadedUrls].slice(0, 5) }))
        toast({ title: 'Photos uploaded', description: `${uploadedUrls.length} photo${uploadedUrls.length === 1 ? '' : 's'} ready to save.` })
      }
    } catch (error) {
      toast({ title: 'Photo upload failed', description: error instanceof Error ? error.message : 'Check your connection and try again.', variant: 'destructive' })
    } finally {
      setUploadingPhotos(false)
    }
  }

  /**
   * Strips LaTeX/maths markup out of pasted text.
   *
   * Briefs copied from ChatGPT or a PDF arrive as "$120\\text{ ml}$"; this
   * writes "120 ml" instead. Text without markup is left to paste natively so
   * the browser's own undo stack is preserved.
   */
  const handleLatexPaste = (event: ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const raw = event.clipboardData.getData('text/plain')
    if (!raw) return
    const cleaned = cleanLatexPaste(raw)
    if (cleaned === raw) return
    event.preventDefault()
    const field = event.currentTarget
    const start = field.selectionStart ?? field.value.length
    const end = field.selectionEnd ?? field.value.length
    field.setRangeText(cleaned, start, end, 'end')
    // React tracks its own value, so tell it the field changed.
    field.dispatchEvent(new Event('input', { bubbles: true }))
  }

  const handlePhotoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
    event.target.value = ''
    void uploadPhotoFiles(selectedFiles)
  }

  const addShade = () => {
    const shade = form.newShade.trim()
    if (!shade) return
    if (form.shades.length >= 100) {
      toast({ title: 'Shade limit reached', description: 'A product can list up to 100 shades.', variant: 'destructive' })
      return
    }
    if (form.shades.some((existing) => existing.toLowerCase() === shade.toLowerCase())) {
      toast({ title: 'Shade already added', description: `${shade} is already in the list.`, variant: 'destructive' })
      return
    }
    setForm((current) => ({ ...current, shades: [...current.shades, shade], newShade: '' }))
  }

  const addIngredient = () => {
    const ingredient = form.newIngredient.trim()
    if (!ingredient) return
    if (form.ingredients.length >= 100) {
      toast({ title: 'Ingredient limit reached', description: 'A product can list up to 100 key ingredients.', variant: 'destructive' })
      return
    }
    if (form.ingredients.some((existing) => existing.toLowerCase() === ingredient.toLowerCase())) {
      toast({ title: 'Ingredient already added', description: `${ingredient} is already in the list.`, variant: 'destructive' })
      return
    }
    setForm((current) => ({ ...current, ingredients: [...current.ingredients, ingredient], newIngredient: '' }))
  }

  const handleSave = async () => {
    if (saving) return
    setFormError(null)
    const reject = (title: string, description: string) => {
      setFormError(description)
      toast({ title, description, variant: 'destructive' })
    }
    if (!form.id && !canCreateProduct) return reject('Create access required', 'Your account cannot create products.')
    if (uploadingPhotos) return reject('Photos are still uploading', 'Wait for every photo upload to finish before saving.')
    if (form.name.trim().length > 200) return reject('Name is too long', 'Product name must be 200 characters or fewer.')
    if (form.shortDescription.length > 300) return reject('Short description is too long', 'Short description must be 300 characters or fewer.')
    if (form.description.length > 5000) return reject('Description is too long', 'Full description must be 5,000 characters or fewer.')
    if (form.skinType.length > 10) return reject('Too many skin types', 'Select 10 skin types or fewer.')
    if (form.shades.length > 100) return reject('Too many shades', 'A product can list up to 100 shades. Remove some before saving.')
    if (form.ingredients.length > 100) return reject('Too many ingredients', 'A product can list up to 100 key ingredients. Remove some before saving.')
    if (!form.price.trim()) return reject('Exact retail price required', 'Enter one exact retail price such as 7000. Do not enter RWF, commas, or a range.')
    if (!isWholeNumber(form.price)) return reject('Invalid retail price', 'Retail price must be one whole-number RWF amount. Do not enter RWF, commas, percentages, or a range.')
    if (form.wholesalePrice.trim() && !isWholeNumber(form.wholesalePrice)) return reject('Invalid wholesale price', 'Wholesale price must be one whole-number RWF amount, not a range.')
    if (form.compareAt.trim() && !isWholeNumber(form.compareAt)) return reject('Invalid compare-at price', 'Compare-at price must be one whole-number RWF amount.')
    if (form.name.trim().length < 2 || !form.categoryId) return reject('Missing fields', 'A product name and active category are required.')
    if (!categories.some((category) => category.id === form.categoryId)) return reject('Invalid category', 'The selected category is inactive or no longer exists. Reload options and select an active category.')
    if (form.brandId && !brands.some((brand) => brand.id === form.brandId)) return reject('Invalid brand', 'The selected brand is inactive or no longer exists.')
    if (form.supplierId !== 'none' && !suppliers.some((supplier) => supplier.id === form.supplierId)) return reject('Invalid supplier', 'The selected supplier is no longer available.')

    const price = Number(form.price)
    const wholesalePrice = form.wholesalePrice.trim() ? Number(form.wholesalePrice) : null
    const compareAt = form.compareAt.trim() ? Number(form.compareAt) : null
    const costPrice = form.costPrice.trim() ? Number(form.costPrice) : null
    const stock = Number(form.stock)
    const lowStockThreshold = Number(form.lowStockThreshold)
    const periodAfterOpening = form.periodAfterOpening.trim() ? Number(form.periodAfterOpening) : null
    const requiredIntegers = [price, stock, lowStockThreshold]
    const optionalIntegers = [wholesalePrice, compareAt, costPrice, periodAfterOpening].filter((value): value is number => value !== null)
    if (!requiredIntegers.every(Number.isFinite) || !optionalIntegers.every(Number.isFinite) || ![...requiredIntegers, ...optionalIntegers].every(Number.isInteger)) {
      return reject('Whole numbers required', 'Prices, stock, thresholds, and opening period must be whole numbers.')
    }
    if (price <= 0) return reject('Invalid price', 'Selling price must be above zero.')
    if (stock < 0 || lowStockThreshold < 0 || (costPrice !== null && costPrice < 0)) return reject('Invalid number', 'Stock, threshold, and cost cannot be negative.')
    if (wholesalePrice !== null && (wholesalePrice <= 0 || wholesalePrice > price)) return reject('Invalid wholesale price', 'Wholesale price must be above zero and cannot exceed retail price.')
    if (compareAt !== null && compareAt !== 0 && compareAt <= price) return reject('Invalid compare-at price', 'Compare-at price must be greater than the selling price.')
    if (periodAfterOpening !== null && (periodAfterOpening < 1 || periodAfterOpening > 120)) return reject('Invalid opening period', 'Use-after-opening must be between 1 and 120 months.')
    if (form.manufacturedDate && form.expiryDate && form.expiryDate <= form.manufacturedDate) return reject('Invalid inventory dates', 'Expiry date must be after the manufacturing date.')

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        shortDescription: form.shortDescription.trim() || null,
        description: form.description.trim(),
        price,
        wholesalePrice,
        compareAt,
        costPrice,
        stock,
        lowStockThreshold,
        sku: form.sku.trim() || null,
        realSku: form.realSku.trim() || null,
        supplierId: form.supplierId === "none" ? null : form.supplierId,
        batchNumber: form.batchNumber.trim() || null,
        manufacturedDate: form.manufacturedDate ? new Date(`${form.manufacturedDate}T00:00:00.000Z`).toISOString() : null,
        expiryDate: form.expiryDate ? new Date(`${form.expiryDate}T00:00:00.000Z`).toISOString() : null,
        periodAfterOpening,
        volume: form.volume.trim() || null,
        categoryId: form.categoryId,
        brandId: form.brandId || null,
        images: form.images,
        skinType: form.skinType.length ? form.skinType : null,
        shades: form.shades.map((value) => value.trim()).filter(Boolean),
        ingredients: form.ingredients.map((value) => value.trim()).filter(Boolean),
        size: form.size.trim() || null,
        usageInstructions: form.usageInstructions.trim() || null,
        warnings: form.warnings.trim() || null,
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
        if (res.status === 401) throw new Error('Your session expired. Sign in again, then reopen the product form.')
        if (res.status === 403) throw new Error('Your account can view products but does not have permission to create or edit them.')
        const fieldErrors = err.details?.fieldErrors as Record<string, string[] | undefined> | undefined
        const firstFieldError = fieldErrors ? Object.values(fieldErrors).flat().find(Boolean) : undefined
        throw new Error(firstFieldError || err.error || `Save failed (${res.status})`)
      }

      toast({
        title: form.id ? "Product updated" : "Product created",
        description: form.name,
      })
      setShowForm(false)
      setForm(EMPTY_FORM)
      setFormError(null)
      await loadProducts()
      onStatsUpdate?.()
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error"
      setFormError(message)
      toast({
        title: "Save failed",
        description: message,
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

  const createSupplier = async () => {
    if (supplierForm.name.trim().length < 2) return
    setSavingSupplier(true)
    try {
      const response = await fetch("/api/admin/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...supplierForm, email: supplierForm.email || null, phone: supplierForm.phone || null, country: supplierForm.country || null }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "Supplier creation failed")
      const supplier = result.supplier as SupplierOption
      setSuppliers((current) => [...current, supplier].sort((a, b) => a.name.localeCompare(b.name)))
      setForm((current) => ({ ...current, supplierId: supplier.id }))
      setSupplierForm({ name: "", email: "", phone: "", country: "" })
      setShowSupplierForm(false)
      toast({ title: "Supplier created", description: supplier.name })
    } catch (error) {
      toast({ title: "Supplier creation failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" })
    } finally {
      setSavingSupplier(false)
    }
  }

  const receiveBatch = async () => {
    if (!batchTarget || !batchForm.batchNumber || Number(batchForm.quantity) < 1) {
      toast({ title: "Batch number and quantity are required", variant: "destructive" })
      return
    }
    setReceivingBatch(true)
    try {
      const response = await fetch(`/api/admin/products/${batchTarget.id}/batches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchNumber: batchForm.batchNumber,
          quantity: Number(batchForm.quantity),
          manufacturedDate: batchForm.manufacturedDate ? new Date(`${batchForm.manufacturedDate}T00:00:00.000Z`).toISOString() : null,
          expiryDate: batchForm.expiryDate ? new Date(`${batchForm.expiryDate}T00:00:00.000Z`).toISOString() : null,
          supplierInvoice: batchForm.supplierInvoice || null,
          notes: batchForm.notes || null,
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "Batch receipt failed")
      toast({ title: "Inventory received", description: `${batchForm.quantity} units added to ${batchTarget.name}` })
      setBatchTarget(null)
      setBatchForm({ batchNumber: "", quantity: "", manufacturedDate: "", expiryDate: "", supplierInvoice: "", notes: "" })
      await loadProducts()
      onStatsUpdate?.()
    } catch (error) {
      toast({ title: "Inventory update failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" })
    } finally {
      setReceivingBatch(false)
    }
  }

  // Quick stock toggle
  const toggleActive = async (product: AdminProduct) => {
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
  const handleDuplicate = (product: AdminProduct) => {
    if (!canCreateProduct) {
      toast({ title: 'Create access required', variant: 'destructive' })
      return
    }
    setFormError(null)
    setForm({
      name: `${product.name} (Copy)`,
      shortDescription: product.shortDescription || "",
      description: product.description,
      price: String(product.price),
      wholesalePrice: product.wholesalePrice !== null && product.wholesalePrice !== undefined ? String(product.wholesalePrice) : "",
      compareAt: product.compareAt ? String(product.compareAt) : "",
      costPrice: product.costPrice !== null ? String(product.costPrice) : "",
      stock: String(product.stock),
      lowStockThreshold: String(product.lowStockThreshold),
      sku: "",
      realSku: "",
      supplierId: product.supplierId || "none",
      batchNumber: "",
      manufacturedDate: "",
      expiryDate: "",
      periodAfterOpening: product.periodAfterOpening ? String(product.periodAfterOpening) : "",
      volume: product.volume || "",
      categoryId: product.categoryId,
      brandId: product.brandId || "",
      images: product.images || [],
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
    if (stockFilter === "in" && p.stock <= p.lowStockThreshold) return false
    if (stockFilter === "low" && (p.stock === 0 || p.stock > p.lowStockThreshold)) return false
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
            {pagination.total} product{pagination.total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {/* NEW: Export CSV button */}
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="mr-1.5 h-4 w-4" /> Export
          </Button>
          {canCreateProduct && <Button onClick={openCreate} disabled={referenceLoading || categories.length === 0}>
            {referenceLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />} Add product
          </Button>}
        </div>
      </div>

      {referenceError && <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="alert"><span>{referenceError}</span><Button type="button" size="sm" variant="outline" onClick={() => void loadReferences()} disabled={referenceLoading}>{referenceLoading ? 'Loading…' : 'Retry options'}</Button></div>}
      {!canCreateProduct && <p className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">You can view products, but only an Admin/Super Admin or staff member with <code>products.crud</code> can add products.</p>}

      {/* Search + Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products by name, SKU, or brand..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setProductPage(1) }}
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
        ) : loadError ? (
          <div className="grid place-items-center px-4 py-16 text-center" role="alert">
            <AlertTriangle className="h-10 w-10 text-fcs-umber" />
            <h3 className="mt-3 font-semibold text-fcs-text">Products could not be loaded</h3>
            <p className="mt-1 max-w-sm text-sm text-fcs-text-muted">{loadError}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4 min-h-11"
              onClick={() => void loadProducts()}
            >
              Try again
            </Button>
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
                          {getAdminPrimaryImage(p) && (
                            <img
                              src={optimizedImageUrl(getAdminPrimaryImage(p), 80)}
                              alt={p.name}
                              loading="lazy"
                              decoding="async"
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="line-clamp-1 font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.brand?.name || "No brand"}
                            {p.featured && " ·  Featured"}
                          </p>
                          <p className="line-clamp-1 text-xs text-muted-foreground">
                            {p.realSku || p.sku || "No SKU"}{p.supplier?.name ? ` · ${p.supplier.name}` : ""}
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
                      {p.costPrice !== null && <p className="text-xs text-muted-foreground">Cost: RWF {p.costPrice.toLocaleString()}</p>}
                      {p.profitMargin !== undefined && <p className={`text-xs font-medium ${p.profitMargin < 0 ? "text-destructive" : "text-emerald-600"}`}>{p.profitMargin}% margin</p>}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span
                        className={
                          p.stock === 0
                            ? "text-destructive"
                            : p.stock <= p.lowStockThreshold
                            ? "text-amber-600"
                            : ""
                        }
                      >
                        {p.stock}
                      </span>
                      <p className="text-xs text-muted-foreground">Alert at {p.lowStockThreshold}</p>
                      {p.batchNumber && <p className="text-xs text-muted-foreground">Batch {p.batchNumber}</p>}
                      {p.expiryDate && <p className={`text-xs ${new Date(p.expiryDate).getTime() <= Date.now() ? "font-semibold text-destructive" : "text-muted-foreground"}`}>Expiry {new Date(p.expiryDate).toLocaleDateString("en-RW")}</p>}
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-emerald-700 hover:bg-emerald-50"
                          onClick={() => { setBatchTarget(p); setBatchForm({ batchNumber: p.batchNumber || "", quantity: "", manufacturedDate: "", expiryDate: "", supplierInvoice: "", notes: "" }) }}
                          aria-label={`Receive inventory for ${p.name}`}
                          title="Receive inventory batch"
                        >
                          <Package className="h-4 w-4" />
                        </Button>
                        {/* Section 3: Wholesale pricing button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-violet-600 hover:bg-violet-50"
                          onClick={() => setPricingTarget(p)}
                          aria-label={`Wholesale pricing for ${p.name}`}
                          title="Wholesale Pricing"
                        >
                          <Tag className="h-4 w-4" />
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
      {pagination.totalPages > 1 && <nav className="mt-4 flex items-center justify-between" aria-label="Product pages"><Button type="button" variant="outline" size="sm" onClick={() => setProductPage((page) => Math.max(1, page - 1))} disabled={productPage <= 1}>Previous</Button><span className="text-xs text-muted-foreground">Page {pagination.page} of {pagination.totalPages}</span><Button type="button" variant="outline" size="sm" onClick={() => setProductPage((page) => Math.min(pagination.totalPages, page + 1))} disabled={productPage >= pagination.totalPages}>Next</Button></nav>}

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) setFormError(null) }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit product" : "Add product"}</DialogTitle>
          </DialogHeader>

          {formError && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800" role="alert" aria-live="assertive">{formError}</div>}
          <div className="space-y-4">
            {!form.id && <details className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
              <summary className="cursor-pointer font-semibold text-blue-950">Paste a product brief from ChatGPT or Gemini</summary>
              <p className="mt-2 text-xs leading-5 text-blue-800">Paste the complete structured brief. Recognized sections are copied into the correct fields. Price ranges are never guessed—you must enter one exact RWF amount.</p>
              <Textarea value={productBrief} onChange={(event) => setProductBrief(event.target.value)} onPaste={handleLatexPaste} rows={10} maxLength={15000} className="mt-3 bg-white" placeholder="Product name

Short Description
...

Full Description
...

Retail Price (Rwanda)
7000" />
              <div className="mt-2 flex items-center justify-between gap-3"><span className="text-xs text-blue-700">{productBrief.length.toLocaleString()} / 15,000 characters</span><Button type="button" variant="outline" onClick={applyProductBrief} disabled={!productBrief.trim()}>Apply brief to form</Button></div>
            </details>}
            {/* Name */}
            <div>
              <Label htmlFor="p-name">Name *</Label>
              <Input
                id="p-name"
                onPaste={handleLatexPaste}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Vitamin C Brightening Serum"
                maxLength={200}
              />
              <p className="mt-1 text-right text-xs text-muted-foreground">{form.name.length} / 200</p>
            </div>

            {/* Short description */}
            <div>
              <Label htmlFor="p-short">Short description (for cards)</Label>
              <Textarea
                id="p-short"
                onPaste={handleLatexPaste}
                value={form.shortDescription}
                onChange={(e) =>
                  setForm({ ...form, shortDescription: e.target.value })
                }
                placeholder="e.g. 15% Vitamin C serum for bright skin."
                maxLength={300}
                rows={3}
              />
              <p className="mt-1 text-right text-xs text-muted-foreground">{form.shortDescription.length} / 300</p>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="p-desc">Description</Label>
              <Textarea
                id="p-desc"
                onPaste={handleLatexPaste}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={8}
                maxLength={5000}
                placeholder="Detailed product description..."
              />
              <p className="mt-1 text-right text-xs text-muted-foreground">{form.description.length.toLocaleString()} / 5,000</p>
            </div>

            {/* Price + Compare + Stock */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <div>
                <Label htmlFor="p-price">Price (RWF) *</Label>
                <Input
                  id="p-price"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="12500"
                />
              </div>
              <div>
                <Label htmlFor="p-wholesale-price">Wholesale Price (RWF)</Label>
                <Input id="p-wholesale-price" type="number" min="1" step="1" inputMode="numeric" value={form.wholesalePrice} onChange={(e) => setForm({ ...form, wholesalePrice: e.target.value })} placeholder="Leave empty for retail price" />
              </div>
              <div>
                <Label htmlFor="p-compare">Compare at (RWF)</Label>
                <Input
                  id="p-compare"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={form.compareAt}
                  onChange={(e) =>
                    setForm({ ...form, compareAt: e.target.value })
                  }
                  placeholder="16000"
                />
              </div>
              <div>
                <Label htmlFor="p-stock">Stock quantity</Label>
                <Input
                  id="p-stock"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  placeholder="48"
                />
              </div>
              <div>
                <Label htmlFor="p-volume">Volume / size</Label>
                <Input id="p-volume" maxLength={100} value={form.volume} onChange={(e) => setForm({ ...form, volume: e.target.value })} placeholder="50 ml" onPaste={handleLatexPaste} />
              </div>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">Enter one exact whole-number RWF amount, for example <strong>7000</strong>. Do not enter “RWF 7,000”, percentages, or ranges such as “5,500–8,500”.</p>

            <details className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
              <summary className="cursor-pointer font-semibold text-amber-950">Advanced inventory and margin</summary>
              <div className="mt-3">
                <p className="text-xs text-amber-800">Optional cost, supplier, batch, manufacturing, expiry, and low-stock controls.</p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div><Label htmlFor="p-cost">Cost price (RWF)</Label><Input id="p-cost" type="number" min="0" step="1" inputMode="numeric" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} /></div>
                <div><Label htmlFor="p-threshold">Low-stock threshold</Label><Input id="p-threshold" type="number" min="0" step="1" inputMode="numeric" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} /></div>
                <div><Label htmlFor="p-sku">SKU (auto-generated if blank)</Label><Input id="p-sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="FCS-A1B2C3" onPaste={handleLatexPaste} /></div>
                <div><Label htmlFor="p-real-sku">Distributor SKU</Label><Input id="p-real-sku" value={form.realSku} onChange={(e) => setForm({ ...form, realSku: e.target.value })} onPaste={handleLatexPaste} /></div>
                <div><div className="flex items-center justify-between"><Label>Supplier</Label><button type="button" onClick={() => setShowSupplierForm(true)} className="text-xs font-medium text-primary">New supplier</button></div><Select value={form.supplierId} onValueChange={(value) => setForm({ ...form, supplierId: value })}><SelectTrigger><SelectValue placeholder="No supplier" /></SelectTrigger><SelectContent><SelectItem value="none">No supplier</SelectItem>{suppliers.map((supplier) => <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>)}</SelectContent></Select></div>
                <div><Label htmlFor="p-batch">Current batch number</Label><Input id="p-batch" value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} /></div>
                <div><Label htmlFor="p-manufactured">Manufactured date</Label><Input id="p-manufactured" type="date" value={form.manufacturedDate} onChange={(e) => setForm({ ...form, manufacturedDate: e.target.value })} /></div>
                <div><Label htmlFor="p-expiry">Expiry date</Label><Input id="p-expiry" type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} /></div>
                <div><Label htmlFor="p-pao">Use after opening (months)</Label><Input id="p-pao" type="number" min="1" max="120" step="1" inputMode="numeric" value={form.periodAfterOpening} onChange={(e) => setForm({ ...form, periodAfterOpening: e.target.value })} /></div>
              </div>
                {form.costPrice && form.price && <p className={`mt-3 text-sm font-semibold ${Number(form.price) - Number(form.costPrice) < 0 ? "text-destructive" : "text-emerald-700"}`}>Estimated margin: {Number(form.price) > 0 ? (((Number(form.price) - Number(form.costPrice)) / Number(form.price)) * 100).toFixed(1) : "0.0"}% · RWF {(Number(form.price) - Number(form.costPrice)).toLocaleString()}</p>}
              </div>
            </details>

            {/* Category + Brand + SKU */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            </div>

            {/* PRODUCT PHOTOS — upload directly from this device */}
            <div>
              <Label>Product Photos *</Label>
              {form.images.length > 0 && (
                <div className="mb-3 mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {form.images.map((url, index) => (
                    <div key={`${url}-${index}`} className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                      <img src={url} alt={`Product photo ${index + 1}`} className="h-full w-full object-cover" />
                      <button type="button" onClick={() => setForm((current) => ({ ...current, images: current.images.filter((_, imageIndex) => imageIndex !== index) }))} className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-red-600 text-white hover:bg-red-700" aria-label={`Remove product photo ${index + 1}`}><X className="h-3.5 w-3.5" /></button>
                      {index === 0 && <span className="absolute bottom-1 left-1 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-white">Main</span>}
                    </div>
                  ))}
                </div>
              )}
              {form.images.length < 5 ? (
                <label onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy' }} onDrop={(event) => { event.preventDefault(); void uploadPhotoFiles(Array.from(event.dataTransfer.files)) }} className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 text-center transition-colors hover:border-fcs-brand hover:bg-gray-50">
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhotos} />
                  {uploadingPhotos ? <><Loader2 className="mb-2 h-8 w-8 animate-spin text-fcs-brand-text" /><span className="text-sm text-gray-500">Uploading photos…</span></> : <><ImagePlus className="mb-2 h-8 w-8 text-gray-400" /><span className="text-sm font-medium text-gray-600">Click to upload or drag photos here</span><span className="mt-1 text-xs text-gray-400">JPG, PNG, WebP · Max 10 MB each · Up to 5</span></>}
                </label>
              ) : <p className="mt-1 text-xs text-fcs-text-muted">Maximum 5 photos reached. Remove one to add another.</p>}
            </div>

            {/* Optional product attributes */}
            <details className="rounded-xl border p-4">
              <summary className="cursor-pointer font-semibold">Advanced product attributes</summary>
              <div className="mt-3">
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
            </details>

            {/* Shades */}
            <div>
              <Label>Shades (for makeup)</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  value={form.newShade}
                  onPaste={handleLatexPaste}
                  maxLength={100}
                  onChange={(e) => setForm({ ...form, newShade: e.target.value })}
                  placeholder="e.g. Deep"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addShade()
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={addShade}
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
                        aria-label={t('accessibility.remove_item', { item: s })}
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
                  onPaste={handleLatexPaste}
                  maxLength={200}
                  onChange={(e) =>
                    setForm({ ...form, newIngredient: e.target.value })
                  }
                  placeholder="e.g. Vitamin C"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addIngredient()
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={addIngredient}
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
                        aria-label={t('accessibility.remove_item', { item: ing })}
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
                onPaste={handleLatexPaste}
                value={form.size}
                onChange={(e) => setForm({ ...form, size: e.target.value })}
                placeholder="e.g. 30ml"
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="p-usage">How to use</Label>
              <Textarea
                id="p-usage"
                onPaste={handleLatexPaste}
                value={form.usageInstructions}
                onChange={(e) =>
                  setForm({ ...form, usageInstructions: e.target.value })
                }
                rows={5}
                maxLength={3000}
                placeholder="Apply 3-4 drops every morning..."
              />
            </div>
            <div>
              <Label htmlFor="p-warnings">Warnings / cautions</Label>
              <Textarea
                id="p-warnings"
                onPaste={handleLatexPaste}
                value={form.warnings}
                onChange={(e) => setForm({ ...form, warnings: e.target.value })}
                rows={5}
                maxLength={3000}
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
            <Button onClick={handleSave} disabled={saving || uploadingPhotos || referenceLoading || categories.length === 0 || (!form.id && !canCreateProduct)}>
              {saving || uploadingPhotos ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {uploadingPhotos ? 'Uploading photos…' : form.id ? "Save changes" : "Create product"}
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

      <Dialog open={showSupplierForm} onOpenChange={setShowSupplierForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add supplier</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label htmlFor="supplier-name">Supplier name *</Label><Input id="supplier-name" value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} /></div>
            <div><Label htmlFor="supplier-email">Email</Label><Input id="supplier-email" type="email" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} /></div>
            <div><Label htmlFor="supplier-phone">Phone</Label><Input id="supplier-phone" value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} /></div>
            <div><Label htmlFor="supplier-country">Country</Label><Input id="supplier-country" value={supplierForm.country} onChange={(e) => setSupplierForm({ ...supplierForm, country: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowSupplierForm(false)}>Cancel</Button><Button onClick={createSupplier} disabled={savingSupplier || supplierForm.name.trim().length < 2}>{savingSupplier && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create supplier</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {batchTarget && (
        <Dialog open={!!batchTarget} onOpenChange={(open) => !open && setBatchTarget(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Receive inventory — {batchTarget.name}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">Receiving a batch creates a permanent batch record and increases the current stock by the quantity entered. Do not enter stock already counted.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label htmlFor="batch-number">Batch number *</Label><Input id="batch-number" value={batchForm.batchNumber} onChange={(e) => setBatchForm({ ...batchForm, batchNumber: e.target.value })} /></div>
                <div><Label htmlFor="batch-quantity">Quantity received *</Label><Input id="batch-quantity" type="number" min="1" value={batchForm.quantity} onChange={(e) => setBatchForm({ ...batchForm, quantity: e.target.value })} /></div>
                <div><Label htmlFor="batch-manufactured">Manufactured date</Label><Input id="batch-manufactured" type="date" value={batchForm.manufacturedDate} onChange={(e) => setBatchForm({ ...batchForm, manufacturedDate: e.target.value })} /></div>
                <div><Label htmlFor="batch-expiry">Expiry date</Label><Input id="batch-expiry" type="date" value={batchForm.expiryDate} onChange={(e) => setBatchForm({ ...batchForm, expiryDate: e.target.value })} /></div>
              </div>
              <div><Label htmlFor="batch-invoice">Supplier invoice/reference</Label><Input id="batch-invoice" value={batchForm.supplierInvoice} onChange={(e) => setBatchForm({ ...batchForm, supplierInvoice: e.target.value })} /></div>
              <div><Label htmlFor="batch-notes">Internal notes</Label><Textarea id="batch-notes" value={batchForm.notes} onChange={(e) => setBatchForm({ ...batchForm, notes: e.target.value })} rows={2} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setBatchTarget(null)} disabled={receivingBatch}>Cancel</Button><Button onClick={receiveBatch} disabled={receivingBatch}>{receivingBatch && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Receive batch</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Section 3: Wholesale Pricing Modal */}
      {pricingTarget && (
        <Dialog open={!!pricingTarget} onOpenChange={(o) => !o && setPricingTarget(null)}>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-violet-600" />
                Wholesale Pricing — {pricingTarget.name}
              </DialogTitle>
            </DialogHeader>
            <WholesalePricingPanel
              productId={pricingTarget.id}
              onClose={() => setPricingTarget(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
