import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import BlogPostContent from '@/components/blog/BlogPostContent'
import StructuredData from '@/components/seo/StructuredData'
import { getPageMetadata } from '@/lib/seo-config'
import { getArticleSchema, getBreadcrumbSchema } from '@/lib/structured-data'

export const revalidate = 300

async function getPost(slug: string) {
  return prisma.blogPost.findFirst({
    where: { slug, status: 'PUBLISHED', isDeleted: false, publishedAt: { lte: new Date() } },
    select: {
      title: true,
      titleRw: true,
      slug: true,
      excerpt: true,
      excerptRw: true,
      content: true,
      contentRw: true,
      coverImage: true,
      imageAlt: true,
      imageAltRw: true,
      authorName: true,
      metaTitle: true,
      metaTitleRw: true,
      metaDescription: true,
      metaDescriptionRw: true,
      tags: true,
      publishedAt: true,
      updatedAt: true,
      viewCount: true,
    },
  })
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug).catch(() => null)
  if (!post) {
    return getPageMetadata({
      title: { en: 'Beauty guide not found', rw: 'Inama y’ubwiza ntiboneka' }, // verified-rw
      description: { en: 'This beauty guide is not currently available.', rw: 'Iyi nama y’ubwiza ntiboneka ubu.' }, // verified-rw
      path: `/blog/${encodeURIComponent(slug)}`,
      noIndex: true,
    })
  }

  return getPageMetadata({
    title: {
      en: post.metaTitle || post.title,
      rw: post.metaTitleRw || post.titleRw || post.title, // verified-rw
    },
    description: {
      en: post.metaDescription || post.excerpt || post.title,
      rw: post.metaDescriptionRw || post.excerptRw || post.excerpt || post.titleRw || post.title, // verified-rw
    },
    path: `/blog/${post.slug}`,
    image: post.coverImage || undefined,
  })
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPost(slug).catch(() => null)
  if (!post) notFound()

  const title = post.titleRw || post.title
  const description = post.excerptRw || post.excerpt || title
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: 'Ahabanza', url: '/' }, // verified-rw
    { name: title, url: `/blog/${post.slug}` },
  ])
  const articleSchema = getArticleSchema({
    title,
    description,
    slug: post.slug,
    publishedAt: (post.publishedAt || post.updatedAt).toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    image: post.coverImage,
    author: post.authorName,
  })

  return (
    <>
      <StructuredData data={[articleSchema, breadcrumbSchema]} />
      <BlogPostContent post={{
        ...post,
        tags: safeTags(post.tags),
        publishedAt: post.publishedAt?.toISOString() || null,
        updatedAt: post.updatedAt.toISOString(),
      }} />
    </>
  )
}

function safeTags(value: string | null) {
  try {
    const parsed: unknown = JSON.parse(value || '[]')
    return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === 'string') : []
  } catch {
    return []
  }
}
