import { v2 as cloudinary } from 'cloudinary'

const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dohoc0tmp'

cloudinary.config({
  cloud_name: cloudName,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

export default cloudinary

export const CLOUDINARY_CONFIG = {
  cloudName,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
  folders: {
    products: 'freedomcosmeticshop/products',
    banners: 'freedomcosmeticshop/banners',
    logo: 'freedomcosmeticshop/logo',
    categories: 'freedomcosmeticshop/categories',
    avatars: 'freedomcosmeticshop/avatars',
  },
}

export async function uploadImage(
  file: string,
  folder = CLOUDINARY_CONFIG.folders.products,
) {
  return cloudinary.uploader.upload(file, {
    folder,
    transformation: [
      { width: 800, height: 800, crop: 'limit' },
      { quality: 'auto' },
      { fetch_format: 'auto' },
    ],
  })
}

export async function deleteImage(publicId: string) {
  return cloudinary.uploader.destroy(publicId)
}

export function getCloudinaryUrl(publicId: string, options?: {
  width?: number
  height?: number
  quality?: string | number
  format?: string
  crop?: string
}): string {
  if (!publicId) return ''
  if (publicId.includes('/image/upload/')) {
    const transforms: string[] = []
    if (options?.width) transforms.push(`w_${options.width}`)
    if (options?.height) transforms.push(`h_${options.height}`)
    if (options?.crop) transforms.push(`c_${options.crop}`)
    transforms.push(`q_${options?.quality || 'auto'}`)
    transforms.push(`f_${options?.format || 'auto'}`)
    return publicId.replace('/image/upload/', `/image/upload/${transforms.join(',')}/`)
  }
  if (publicId.startsWith('http')) return publicId
  return `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}`
}

export const CLOUDINARY_UPLOAD_PRESET = 'freedom_uploads'
