import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://freedom-cosmetic-shop.vercel.app'
  const now = new Date()
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/products`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/wholesale`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/shipping`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/returns`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ]
  try {
    const [products, categories, posts] = await Promise.all([
      prisma.product.findMany({ where: { isActive: true, isDeleted: false }, select: { slug: true, updatedAt: true } }),
      prisma.category.findMany({ where: { isActive: true, isDeleted: false }, select: { slug: true, updatedAt: true } }),
      prisma.blogPost.findMany({ where: { status: 'PUBLISHED', isDeleted: false }, select: { slug: true, updatedAt: true } }),
    ])
    return [
      ...staticRoutes,
      ...products.map((item) => ({ url: `${baseUrl}/products/${item.slug}`, lastModified: item.updatedAt, changeFrequency: 'weekly' as const, priority: 0.8 })),
      ...categories.map((item) => ({ url: `${baseUrl}/products?category=${encodeURIComponent(item.slug)}`, lastModified: item.updatedAt, changeFrequency: 'weekly' as const, priority: 0.7 })),
      ...posts.map((item) => ({ url: `${baseUrl}/blog/${item.slug}`, lastModified: item.updatedAt, changeFrequency: 'monthly' as const, priority: 0.6 })),
    ]
  } catch {
    // Return core routes when the database is unavailable during a build.
    return staticRoutes
  }
}
