/**
 * Cloudinary Client for FreedomCosmeticShop
 * Cloud Name: dohoc0tmp
 */

export const CLOUDINARY_CONFIG = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dohoc0tmp",
  apiKey: process.env.CLOUDINARY_API_KEY || "524578837153868",
  apiSecret: process.env.CLOUDINARY_API_SECRET || "ggf5-0eqMOIvtxQXokzy6-Nr1yU",
  folders: {
    products: "freedomcosmeticshop/products",
    banners: "freedomcosmeticshop/banners",
    logo: "freedomcosmeticshop/logo",
    categories: "freedomcosmeticshop/categories",
    avatars: "freedomcosmeticshop/avatars",
  },
}

export function getCloudinaryUrl(publicId: string, options?: {
  width?: number
  height?: number
  quality?: string | number
  format?: string
  crop?: string
}): string {
  const cloudName = CLOUDINARY_CONFIG.cloudName
  if (!publicId) return ""
  if (publicId.includes("/image/upload/")) {
    const transforms: string[] = []
    if (options?.width) transforms.push(`w_${options.width}`)
    if (options?.height) transforms.push(`h_${options.height}`)
    if (options?.crop) transforms.push(`c_${options.crop}`)
    transforms.push(`q_${options?.quality || "auto"}`)
    transforms.push(`f_${options?.format || "auto"}`)
    if (transforms.length > 0) {
      return publicId.replace("/image/upload/", `/image/upload/${transforms.join(",")}/`)
    }
    return publicId
  }
  if (publicId.startsWith("http")) return publicId
  return `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}`
}

export const CLOUDINARY_UPLOAD_PRESET = "freedom_uploads"
