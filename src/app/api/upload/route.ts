export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

import { NextResponse } from 'next/server'
import { cloudinaryIsConfigured, uploadImageBuffer } from '@/lib/cloudinary'
import { requireRole } from '@/lib/auth'

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const maxBytes = 10 * 1024 * 1024
const allowedFolders = new Set(['products', 'banners', 'logo', 'categories', 'avatars'])

export async function POST(request: Request) {
  try {
    await requireRole('ADMIN', 'MANAGER', 'STAFF')
    if (!cloudinaryIsConfigured()) return NextResponse.json({ success: false, error: 'Cloudinary is not configured' }, { status: 503 })
    const form = await request.formData().catch(() => null)
    if (!form) return NextResponse.json({ success: false, error: 'A multipart form upload is required' }, { status: 400 })
    const file = form.get('file')
    const requestedFolder = String(form.get('folder') || 'products')
    const folder = allowedFolders.has(requestedFolder) ? requestedFolder : 'products'
    if (!(file instanceof File)) return NextResponse.json({ success: false, error: 'Image file is required' }, { status: 400 })
    if (!allowedTypes.has(file.type)) return NextResponse.json({ success: false, error: 'Only JPEG, PNG, and WebP images are allowed' }, { status: 400 })
    if (file.size < 1 || file.size > maxBytes) return NextResponse.json({ success: false, error: 'Image must be smaller than 10 MB' }, { status: 400 })
    const image = await uploadImageBuffer(Buffer.from(await file.arrayBuffer()), `freedomcosmeticshop/${folder}`)
    return NextResponse.json({ success: true, data: { image }, image }, { status: 201 })
  } catch (error) {
    const status = error instanceof Error && 'statusCode' in error ? Number((error as { statusCode: number }).statusCode) : 500
    if (status === 500) console.error('Upload API error:', error)
    return NextResponse.json({ success: false, error: status === 500 ? (error instanceof Error ? error.message : 'Image upload failed') : (error as Error).message }, { status })
  }
}
