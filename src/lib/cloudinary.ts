import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary'

const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dohoc0tmp'
const apiKey = process.env.CLOUDINARY_API_KEY
const apiSecret = process.env.CLOUDINARY_API_SECRET

cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true })

export default cloudinary

export const CLOUDINARY_CONFIG = {
  cloudName,
  apiKey,
  apiSecret,
  folders: {
    products: 'freedomcosmeticshop/products',
    banners: 'freedomcosmeticshop/banners',
    logo: 'freedomcosmeticshop/logo',
    categories: 'freedomcosmeticshop/categories',
    avatars: 'freedomcosmeticshop/avatars',
  },
}

export function cloudinaryIsConfigured() {
  return Boolean(cloudName && apiKey && apiSecret)
}

export async function verifyCloudinaryConnection() {
  if (!cloudinaryIsConfigured()) return { configured: false, connected: false }
  try {
    const result = await cloudinary.api.ping()
    return { configured: true, connected: result.status === 'ok' }
  } catch {
    return { configured: true, connected: false }
  }
}

export async function uploadImageBuffer(
  fileBuffer: Buffer,
  folder = CLOUDINARY_CONFIG.folders.products,
): Promise<{ url: string; publicId: string; width: number; height: number; format: string; bytes: number }> {
  if (!cloudinaryIsConfigured()) throw new Error('Cloudinary credentials are not configured')
  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder,
      resource_type: 'image',
      unique_filename: true,
      overwrite: false,
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
    }, (error, response) => {
      if (error) reject(error)
      else if (!response) reject(new Error('Cloudinary returned no upload result'))
      else resolve(response)
    })
    stream.end(fileBuffer)
  })
  return { url: result.secure_url, publicId: result.public_id, width: result.width, height: result.height, format: result.format, bytes: result.bytes }
}

export async function uploadImage(file: string, folder = CLOUDINARY_CONFIG.folders.products) {
  if (!cloudinaryIsConfigured()) throw new Error('Cloudinary credentials are not configured')
  return cloudinary.uploader.upload(file, {
    folder,
    transformation: [
      { width: 1200, height: 1200, crop: 'limit' },
      { quality: 'auto:good' },
      { fetch_format: 'auto' },
    ],
  })
}

export async function deleteImage(publicId: string) {
  if (!cloudinaryIsConfigured()) throw new Error('Cloudinary credentials are not configured')
  return cloudinary.uploader.destroy(publicId)
}

export function getCloudinaryUrl(publicId: string, options?: { width?: number; height?: number; quality?: string | number; format?: string; crop?: string }): string {
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
