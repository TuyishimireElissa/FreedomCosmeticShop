"use client"

/**
 * LogoUploader — admin component for uploading/removing shop logo.
 *
 * Features:
 *   - Drag & drop file upload
 *   - File type validation (JPG, PNG, WebP, SVG)
 *   - File size validation (max 5MB)
 *   - Image preview before upload
 *   - Upload progress indication
 *   - Current logo display
 *   - Remove logo (revert to text)
 *   - Real-time update to all clients via SSE
 */

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { Upload, Trash2, Loader2, CheckCircle2, XCircle, ImageIcon } from "lucide-react"

export function LogoUploader() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [currentLogo, setCurrentLogo] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/settings/store")
      if (!res.ok) return
      const data = await res.json()
      setCurrentLogo(data.settings?.logoUrl || null)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const validateFile = (file: File): string | null => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"]
    if (!allowedTypes.includes(file.type)) {
      return `Invalid file type: ${file.type}. Only JPG, PNG, WebP, and SVG are allowed.`
    }
    if (file.size > 5 * 1024 * 1024) {
      return `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum size is 5MB.`
    }
    return null
  }

  const handleFileSelect = (file: File) => {
    const error = validateFile(file)
    if (error) {
      toast({ title: "❌ Invalid file", description: error, variant: "destructive" })
      return
    }
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("logo", selectedFile)

      const res = await fetch("/api/settings/logo", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Upload failed")

      toast({
        title: "✅ Logo uploaded successfully!",
        description: "Your logo is now live on the website and admin panel.",
      })
      setCurrentLogo(data.logoUrl)
      setSelectedFile(null)
      setPreviewUrl(null)
    } catch (e) {
      toast({
        title: "❌ Upload failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    if (!confirm("Remove the current logo? The store name will show as text instead.")) return
    setUploading(true)
    try {
      const res = await fetch("/api/settings/logo", { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")

      toast({ title: "Logo removed", description: "Showing text logo (FreedomCosmeticShop)" })
      setCurrentLogo(null)
    } catch (e) {
      toast({
        title: "Failed to remove logo",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const cancelSelection = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  if (loading) {
    return <Skeleton className="h-48 w-full rounded-2xl" />
  }

  return (
    <div className="rounded-2xl border bg-card p-5">
      <h3 className="flex items-center gap-2 text-sm font-bold">
        <ImageIcon className="h-4 w-4 text-primary" />
        🖼️ Shop Logo Settings
      </h3>

      {/* Current logo */}
      <div className="mt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Current Logo
        </p>
        <div className="grid h-24 place-items-center rounded-xl border bg-secondary/20">
          {currentLogo ? (
            <img
              src={currentLogo}
              alt="Shop Logo"
              className="max-h-20 max-w-full object-contain"
            />
          ) : (
            <span className="text-lg font-bold text-muted-foreground">FreedomCosmeticShop</span>
          )}
        </div>
        {currentLogo && (
          <p className="mt-1 text-[10px] text-muted-foreground">
            Logo is live on website, admin, and invoices.
          </p>
        )}
      </div>

      {/* File selection / preview */}
      {!selectedFile ? (
        <div
          className={`mt-4 cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm font-medium">Drag & drop your logo here</p>
          <p className="text-xs text-muted-foreground">or</p>
          <Button variant="outline" size="sm" className="mt-2">
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Choose from Computer
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="mt-4 rounded-xl border p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Preview
          </p>
          <div className="flex items-center gap-3">
            <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg border bg-secondary/20">
              {previewUrl && (
                <img src={previewUrl} alt="Preview" className="max-h-full max-w-full object-contain" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(0)} KB · {selectedFile.type}
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                <CheckCircle2 className="h-3 w-3" /> File is valid
              </span>
            </div>
          </div>

          {/* How it will look */}
          <div className="mt-3 space-y-1 rounded-lg bg-secondary/20 p-2 text-xs">
            <p className="flex items-center gap-1.5">
              <span className="font-medium">Navbar:</span>
              {previewUrl ? (
                <img src={previewUrl} alt="" className="inline h-5 max-w-[80px] object-contain align-middle" />
              ) : null}
              <span className="font-semibold">FreedomCosmeticShop</span>
            </p>
          </div>

          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" onClick={cancelSelection} className="flex-1">
              <XCircle className="mr-1.5 h-3.5 w-3.5" /> Cancel
            </Button>
            <Button size="sm" onClick={handleUpload} disabled={uploading} className="flex-1">
              {uploading ? (
                <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="mr-1.5 h-3.5 w-3.5" /> Upload Logo Now</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Requirements */}
      <div className="mt-3 rounded-lg bg-secondary/20 p-3 text-[10px] text-muted-foreground">
        <p className="font-medium text-foreground">Requirements:</p>
        <ul className="mt-1 space-y-0.5">
          <li>✅ JPG, PNG, WebP, or SVG format</li>
          <li>✅ Maximum size: 5MB</li>
          <li>✅ Recommended: 500×500px square</li>
          <li>✅ White or transparent background works best</li>
        </ul>
      </div>

      {/* Danger zone */}
      {currentLogo && !selectedFile && (
        <div className="mt-3 border-t pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemove}
            disabled={uploading}
            className="w-full text-destructive hover:bg-destructive/10"
          >
            {uploading ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            )}
            Remove Current Logo
          </Button>
          <p className="mt-1 text-center text-[10px] text-muted-foreground">
            Will revert to text: "FreedomCosmeticShop"
          </p>
        </div>
      )}
    </div>
  )
}
