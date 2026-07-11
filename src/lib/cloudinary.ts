import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dohoc0tmp',
  api_key: process.env.CLOUDINARY_API_KEY || '524578837153868',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'ggf5-0eqMOIvtxQXokzy6-Nr1yU',
  secure: true,
})

export default cloudinary

export const CLOUDINARY_CONFIG = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'dohoc0tmp',
  apiKey: process.env.CLOUDINARY_API_KEY || '524578837153868',
  apiSecret: process.env.CLOUDINARY_API_SECRET || 'ggf5-0eqMOIvtxQXokzy6-Nr1yU',
  folders: {
    products: 'freedomcosmeticshop/products',
    banners: 'freedomcosmeticshop/banners',
    logo: 'freedomcosmeticshop/logo',
    categories: 'freedomcosmeticshop/categories',
  }
}

export async function uploadImage(
  file: string,
  folder = 'freedomcosmeticshop/products'
) {
  return cloudinary.uploader.upload(file, {
    folder,
    transformation: [
      { width: 800, height: 800, crop: 'limit' },
      { quality: 'auto' },
      { format: 'auto' },
    ],
  })
}

export async function deleteImage(publicId: string) {
  return cloudinary.uploader.destroy(publicId)
}

export function getImageUrl(
  publicId: string,
  width = 400,
  height = 400
): string {
  return `https://res.cloudinary.com/dohoc0tmp/image/upload/w_${width},h_${height},q_auto,f_auto/${publicId}`
}

export function getCloudinaryUrl(publicId: string, options?: {
  width?: number
  height?: number
  quality?: string | number
  format?: string
}): string {
  if (!publicId) return ''
  if (publicId.includes('/image/upload/')) {
    const transforms: string[] = []
    if (options?.width) transforms.push(`w_${options.width}`)
    if (options?.height) transforms.push(`h_${options.height}`)
    transforms.push(`q_${options?.quality || 'auto'}`)
    transforms.push(`f_${options?.format || 'auto'}`)
    if (transforms.length > 0) {
      return publicId.replace('/image/upload/', `/image/upload/${transforms.join(',')}/`)
    }
    return publicId
  }
  if (publicId.startsWith('http')) return publicId
  return `https://res.cloudinary.com/dohoc0tmp/image/upload/${publicId}`
}

export const CLOUDINARY_UPLOAD_PRESET = 'freedom_uploads'
