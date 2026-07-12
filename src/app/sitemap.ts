import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://freedom-cosmetic-shop.vercel.app'
  const now = new Date()
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/products`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/register`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ]
  try {
    const [products, categories] = await Promise.all([
      prisma.product.findMany({ where: { isActive: true, isDeleted: false }, select: { slug: true, updatedAt: true } }),
      prisma.category.findMany({ where: { isActive: true, isDeleted: false }, select: { slug: true, updatedAt: true } }),
    ])
    return [
      ...staticRoutes,
      ...products.map((item) => ({ url: `${baseUrl}/products/${item.slug}`, lastModified: item.updatedAt, changeFrequency: 'weekly' as const, priority: 0.8 })),
      ...categories.map((item) => ({ url: `${baseUrl}/products?category=${encodeURIComponent(item.slug)}`, lastModified: item.updatedAt, changeFrequency: 'weekly' as const, priority: 0.7 })),
    ]
  } catch (error) {
    console.error('Sitemap database query failed:', error)
    return staticRoutes
  }
}
