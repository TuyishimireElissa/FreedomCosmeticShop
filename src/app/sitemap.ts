import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
import { SEO_CONFIG } from '@/lib/seo-config'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SEO_CONFIG.siteUrl
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/products`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/bundles`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/wholesale`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/quiz`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/shipping`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/returns`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/contact`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/faq`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/support/whatsapp`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${baseUrl}/terms`, changeFrequency: 'yearly', priority: 0.2 },
  ]

  try {
    const [products, categories, posts, bundles] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true, isDeleted: false },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.category.findMany({
        where: { isActive: true, isDeleted: false },
        select: { slug: true, updatedAt: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.blogPost.findMany({
        where: { status: 'PUBLISHED', isDeleted: false },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.bundle.findMany({
        where: { isActive: true, deletedAt: null },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
    ])

    return [
      ...staticRoutes,
      ...products.map((item) => ({
        url: `${baseUrl}/products/${encodeURIComponent(item.slug)}`,
        lastModified: item.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
      ...categories.map((item) => ({
        url: `${baseUrl}/products?category=${encodeURIComponent(item.slug)}`,
        lastModified: item.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
      ...posts.map((item) => ({
        url: `${baseUrl}/blog/${encodeURIComponent(item.slug)}`,
        lastModified: item.updatedAt,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      })),
      ...bundles.map((item) => ({
        url: `${baseUrl}/bundles/${encodeURIComponent(item.slug)}`,
        lastModified: item.updatedAt,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      })),
    ]
  } catch (error) {
    console.error('Sitemap database entries unavailable:', error instanceof Error ? error.message : 'unknown error')
    return staticRoutes
  }
}
