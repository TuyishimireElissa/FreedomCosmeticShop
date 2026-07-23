'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { CheckCircle2, ImagePlus, Loader2, Star, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import type { ProductImage } from '@/lib/types'

const IMAGE_TYPES = [
  ['PRODUCT', 'Product'],
  ['PACKAGING', 'Packaging'],
  ['BACK_LABEL', 'Back / ingredient label'],
  ['SEAL', 'Authenticity seal'],
  ['TEXTURE', 'Texture'],
  ['SIZE_SCALE', 'Size comparison'],
  ['SHADE', 'Shade'],
  ['LIFESTYLE', 'Lifestyle / in use'],
  ['VIDEO_THUMB', 'Video thumbnail'],
] as const

export default function AdminProductImageManager({ productId, productName, onChanged }: { productId: string; productName: string; onChanged?: () => void }) {
  const { toast } = useToast()
  const [images, setImages] = useState<ProductImage[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [imageType, setImageType] = useState('PRODUCT')
  const [altText, setAltText] = useState(productName)
  const [altTextRw, setAltTextRw] = useState('')
  const [isPrimary, setIsPrimary] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/products/${productId}/images`, { cache: 'no-store' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Images could not be loaded')
      setImages(result.images || [])
    } catch (error) {
      toast({ title: 'Image loading failed', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [productId, toast])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const urls = files.map((selected) => URL.createObjectURL(selected))
    setPreviews(urls)
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [files])

  const upload = async () => {
    if (files.length === 0 || altText.trim().length < 2) {
      toast({ title: 'Choose an image and add descriptive alt text', variant: 'destructive' })
      return
    }
    setUploading(true)
    try {
      for (const [index, selectedFile] of files.entries()) {
        const body = new FormData()
        body.set('file', selectedFile)
        body.set('imageType', imageType)
        body.set('altText', files.length === 1 ? altText.trim() : `${altText.trim()} ${index + 1}`)
        body.set('altTextRw', altTextRw.trim())
        body.set('isPrimary', String(isPrimary && index === 0))
        const response = await fetch(`/api/admin/products/${productId}/images`, { method: 'POST', body })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(result.error || `Upload failed for ${selectedFile.name}`)
      }
      setFiles([])
      setImageType('PRODUCT')
      setAltText(productName)
      setAltTextRw('')
      setIsPrimary(false)
      const input = document.getElementById(`product-image-file-${productId}`) as HTMLInputElement | null
      if (input) input.value = ''
      toast({ title: files.length === 1 ? 'Product image uploaded' : 'Product images uploaded', description: `${files.length} file${files.length === 1 ? '' : 's'} · ${productName}` })
      await load()
      onChanged?.()
    } catch (error) {
      toast({ title: 'Image upload failed', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const setPrimary = async (image: ProductImage) => {
    if (image.isPrimary) return
    setWorkingId(image.id)
    try {
      const response = await fetch(`/api/admin/products/${productId}/images/${image.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isPrimary: true }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Update failed')
      await load()
      onChanged?.()
    } catch (error) {
      toast({ title: 'Primary image update failed', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' })
    } finally {
      setWorkingId(null)
    }
  }

  const remove = async (image: ProductImage) => {
    if (!window.confirm(`Delete this ${image.imageType.toLowerCase()} image?`)) return
    setWorkingId(image.id)
    try {
      const response = await fetch(`/api/admin/products/${productId}/images/${image.id}`, { method: 'DELETE' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Delete failed')
      toast({ title: 'Product image deleted' })
      await load()
      onChanged?.()
    } catch (error) {
      toast({ title: 'Image deletion failed', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' })
    } finally {
      setWorkingId(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-dashed border-rose-200 bg-rose-50/30 p-4">
        <h3 className="flex items-center gap-2 font-semibold"><ImagePlus className="h-4 w-4 text-[#B76E79]" />Upload to Cloudinary</h3>
        <p className="mt-1 text-xs text-muted-foreground">JPEG, PNG, or WebP · maximum 8 MB · saved in freedomcosmeticshop/products</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label htmlFor={`product-image-file-${productId}`}>Image files *</Label><Input id={`product-image-file-${productId}`} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, Math.max(0, 20 - images.length)))} /></div>
          {previews.length > 0 && <div className="sm:col-span-2"><p className="mb-2 text-xs font-medium text-muted-foreground">Selected image preview</p><div className="grid grid-cols-3 gap-3 sm:grid-cols-5">{previews.map((url, index) => <div key={url} className="relative aspect-square overflow-hidden rounded-xl bg-gray-100"><img src={url} alt={`Selected upload ${index + 1}`} className="h-full w-full object-cover" /><button type="button" onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-red-600 text-xs font-bold text-white" aria-label={`Remove selected image ${index + 1}`}><Trash2 className="h-3.5 w-3.5" /></button></div>)}</div></div>}
          <div><Label>Image purpose *</Label><Select value={imageType} onValueChange={setImageType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{IMAGE_TYPES.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
          <label className="flex items-end gap-2 pb-2 text-sm"><Checkbox checked={isPrimary} onCheckedChange={(value) => setIsPrimary(value === true)} />Make primary product image</label>
          <div><Label htmlFor={`image-alt-${productId}`}>English alt text *</Label><Input id={`image-alt-${productId}`} value={altText} maxLength={300} onChange={(event) => setAltText(event.target.value)} /></div>
          <div><Label htmlFor={`image-alt-rw-${productId}`}>Kinyarwanda alt text</Label><Input id={`image-alt-rw-${productId}`} value={altTextRw} maxLength={300} onChange={(event) => setAltTextRw(event.target.value)} /></div>
        </div>
        <Button type="button" onClick={upload} disabled={uploading || files.length === 0 || altText.trim().length < 2} className="mt-4">{uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}{uploading ? 'Uploading…' : `Upload ${files.length || ''} image${files.length === 1 ? '' : 's'}`}</Button>
      </div>

      <div>
        <h3 className="font-semibold">Structured product images ({images.length}/20)</h3>
        {loading ? <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading images…</div> : images.length === 0 ? <p className="py-8 text-sm text-muted-foreground">No structured images yet. Legacy URL images remain available until replaced.</p> : <div className="mt-3 grid gap-3 sm:grid-cols-2">{images.map((image) => <article key={image.id} className="flex gap-3 rounded-xl border p-3"><div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-secondary"><Image src={image.url} alt={image.altText} fill sizes="80px" className="object-contain" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1"><span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">{image.imageType}</span>{image.isPrimary && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-3 w-3" />Primary</span>}</div><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{image.altText}</p><div className="mt-2 flex gap-1"><Button type="button" variant="outline" size="sm" className="h-8 px-2 text-xs" disabled={image.isPrimary || workingId === image.id} onClick={() => setPrimary(image)}><Star className="mr-1 h-3 w-3" />Primary</Button><Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs text-destructive" disabled={workingId === image.id} onClick={() => remove(image)}>{workingId === image.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}</Button></div></div></article>)}</div>}
      </div>
    </div>
  )
}
