/**
 * Storage service — Cloudinary image uploads.
 *
 * Used by the admin dashboard to upload product images.
 *
 * To complete this integration:
 *   1. Sign up at https://cloudinary.com/ → get cloud_name, api_key, api_secret
 *   2. Set CLOUDINARY_* in .env
 *   3. Create an unsigned upload preset in Cloudinary dashboard
 *
 * For server-side (signed) uploads, use the Cloudinary SDK:
 *   bun add cloudinary
 */

import { env } from "@/lib/env"

export type UploadResult = {
  success: boolean
  url?: string
  publicId?: string
  message: string
}

/**
 * Upload an image to Cloudinary from a base64 string (server-side).
 */
export async function uploadImage(
  base64: string,
  folder = "freedom-cosmetic-shop/products"
): Promise<UploadResult> {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY) {
    return {
      success: false,
      message: "Cloudinary credentials not configured.",
    }
  }

  try {
    // Use Cloudinary's unsigned upload API
    const formData = new FormData()
    formData.append("file", base64)
    formData.append("upload_preset", env.CLOUDINARY_UPLOAD_PRESET || "freedom_uploads")
    formData.append("folder", folder)

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData }
    )

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Cloudinary upload failed: ${err}`)
    }

    const data = await res.json()
    return {
      success: true,
      url: data.secure_url,
      publicId: data.public_id,
      message: "Image uploaded successfully.",
    }
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Upload failed",
    }
  }
}

/**
 * Delete an image from Cloudinary by public ID.
 * (Stub — implement when admin image management is added.)
 */
export async function deleteImage(_publicId: string): Promise<UploadResult> {
  return {
    success: false,
    message: "Image deletion is unavailable through this legacy service.",
  }
}

/**
 * Generate an optimized URL for a Cloudinary image.
 * Useful for generating thumbnails / responsive variants.
 *
 * Example:
 *   optimizeUrl("https://res.cloudinary.com/.../image/upload/v123/photo.jpg", { width: 400, quality: "auto" })
 *   → "https://res.cloudinary.com/.../image/upload/c_limit,w_400,q_auto/v123/photo.jpg"
 */
export function optimizeUrl(
  url: string,
  opts: {
    width?: number
    height?: number
    quality?: "auto" | number
    format?: "webp" | "auto"
  } = {}
): string {
  if (!url.includes("cloudinary.com") || !url.includes("/image/upload/")) {
    return url // Not a Cloudinary URL, return as-is
  }

  const transformations: string[] = []
  if (opts.width) transformations.push(`w_${opts.width}`)
  if (opts.height) transformations.push(`h_${opts.height}`)
  if (opts.width && opts.height) transformations.push("c_limit")
  transformations.push(`q_${opts.quality || "auto"}`)
  transformations.push(`f_${opts.format || "auto"}`)

  return url.replace("/image/upload/", `/image/upload/${transformations.join(",")}/`)
}
