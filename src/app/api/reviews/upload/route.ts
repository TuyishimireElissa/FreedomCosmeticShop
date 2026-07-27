export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import cloudinary from '@/lib/cloudinary'
import { requireAuth } from '@/lib/auth'
import { rateLimit } from '@/lib/permissions'

const allowedTypes = new Set(['image/jpeg','image/png','image/webp'])
const MAX_BYTES = 5 * 1024 * 1024

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ success: false, error: 'AUTH_REQUIRED' }, { status: 401 })
    const limit = rateLimit(`review-upload:${user.id}`, { maxActions: 10, windowMs: 60_000 })
    if (!limit.allowed) return NextResponse.json({ success: false, error: 'RATE_LIMITED' }, { status: 429 })
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File) || !allowedTypes.has(file.type) || file.size < 1 || file.size > MAX_BYTES) return NextResponse.json({ success: false, error: 'INVALID_REVIEW_PHOTO' }, { status: 400 })
    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await cloudinary.uploader.upload(`data:${file.type};base64,${buffer.toString('base64')}`, {
      folder: 'freedomcosmeticshop/reviews',
      resource_type: 'image',
      transformation: [{ width: 1600, height: 1600, crop: 'limit' }, { quality: 'auto' }, { fetch_format: 'auto' }, { flags: 'strip_profile' }],
    })
    return NextResponse.json({ success: true, data: { url: result.secure_url } }, { status: 201 })
  } catch (error) {
    console.error('Review photo upload failed:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ success: false, error: 'REVIEW_PHOTO_UPLOAD_FAILED' }, { status: 500 })
  }
}
