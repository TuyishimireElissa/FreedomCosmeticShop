import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Calendar, Eye } from 'lucide-react'
import { prisma } from '@/lib/prisma'

export const revalidate = 300

async function getPost(slug: string) {
  return prisma.blogPost.findFirst({
    where: { slug, status: 'PUBLISHED', isDeleted: false },
    select: {
      title: true,
      slug: true,
      excerpt: true,
      content: true,
      coverImage: true,
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
  if (!post) return { title: 'Beauty guide not found' }
  return {
    title: post.title,
    description: post.excerpt || undefined,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt || undefined,
      images: post.coverImage ? [{ url: post.coverImage }] : undefined,
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
    },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPost(slug).catch(() => null)
  if (!post) notFound()
  const tags = post.tags ? safeTags(post.tags) : []
  return <main className="min-h-screen bg-[#f8f9fa] px-4 py-8 sm:px-6 lg:px-8"><article className="mx-auto max-w-3xl overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm">{post.coverImage&&<img src={post.coverImage} alt={post.title} className="aspect-[16/8] w-full object-cover" />}<div className="p-6 sm:p-10"><Link href="/" className="inline-flex items-center gap-1 text-xs font-bold text-[#B76E79]"><ArrowLeft className="h-3.5 w-3.5" />Back to beauty guides</Link><div className="mt-5 flex flex-wrap gap-2">{tags.map(tag=><span key={tag} className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-[#B76E79]">#{tag}</span>)}</div><h1 className="mt-4 text-3xl font-black leading-tight text-[#1a1a1a] sm:text-4xl">{post.title}</h1><div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-400"><span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{(post.publishedAt||post.updatedAt).toLocaleDateString('en-RW',{dateStyle:'medium'})}</span><span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{post.viewCount} views</span></div>{post.excerpt&&<p className="mt-6 border-l-4 border-[#B76E79] pl-4 text-lg leading-8 text-gray-600">{post.excerpt}</p>}<div className="prose prose-sm mt-8 max-w-none whitespace-pre-line leading-7 text-gray-700">{post.content}</div></div></article></main>
}
function safeTags(value:string){try{const tags=JSON.parse(value);return Array.isArray(tags)?tags:[]}catch{return []}}
