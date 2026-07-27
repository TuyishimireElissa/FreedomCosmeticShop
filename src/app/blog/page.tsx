import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import BlogListingClient from '@/components/blog/BlogListingClient'
import { getPageMetadata } from '@/lib/seo-config'

export const revalidate = 300

export const metadata: Metadata = getPageMetadata({
  title: { en: 'Beauty tips and guides', rw: 'Inama n’amabwiriza by’ubwiza' }, // verified-rw
  description: {
    en: 'Practical skincare, makeup and haircare guides from FreedomCosmeticShop.',
    rw: 'Inama zifatika ku kwita ku ruhu, kwisiga no kwita ku musatsi zitangwa na FreedomCosmeticShop.', // verified-rw
  },
  path: '/blog',
})

export default async function BlogPage() {
  const rows = await prisma.blogPost.findMany({
    where: { status: 'PUBLISHED', isDeleted: false, publishedAt: { lte: new Date() } },
    select: { slug: true, title: true, titleRw: true, excerpt: true, excerptRw: true, category: true, publishedAt: true },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: 60,
  }).catch(() => [])

  return <BlogListingClient posts={rows.map((post) => ({ ...post, publishedAt: post.publishedAt?.toISOString() || null }))} />
}
