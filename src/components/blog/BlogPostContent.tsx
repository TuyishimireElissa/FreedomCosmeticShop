'use client'

import Link from 'next/link'
import { ArrowLeft, Calendar, Eye } from 'lucide-react'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface BlogPostContentProps {
  post: {
    title: string
    titleRw: string | null
    slug: string
    excerpt: string | null
    excerptRw: string | null
    content: string
    contentRw: string | null
    coverImage: string | null
    imageAlt: string | null
    imageAltRw: string | null
    tags: string[]
    publishedAt: string | null
    updatedAt: string
    viewCount: number
  }
}

export default function BlogPostContent({ post }: BlogPostContentProps) {
  const { language, t } = useLanguage()
  const useKinyarwanda = language === 'rw'
  const title = useKinyarwanda && post.titleRw ? post.titleRw : post.title
  const excerpt = useKinyarwanda && post.excerptRw ? post.excerptRw : post.excerpt
  const content = useKinyarwanda && post.contentRw ? post.contentRw : post.content
  const imageAlt = useKinyarwanda
    ? post.imageAltRw || post.titleRw || post.imageAlt || post.title
    : post.imageAlt || post.title
  const date = new Date(post.publishedAt || post.updatedAt)

  return (
    <main className="min-h-screen bg-[#f8f9fa] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto mb-3 max-w-3xl">
        <Breadcrumbs items={[{ name: title, url: `/blog/${post.slug}` }]} />
      </div>
      <article className="mx-auto max-w-3xl overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm">
        {post.coverImage && <img src={post.coverImage} alt={imageAlt} className="aspect-[16/8] w-full object-cover" />}
        <div className="p-6 sm:p-10">
          <Link href="/" className="inline-flex min-h-11 items-center gap-1 text-xs font-bold text-[#9c5964]">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />{t('blog.back_to_guides')}
          </Link>
          <div className="mt-5 flex flex-wrap gap-2">
            {post.tags.map((tag) => <span key={tag} className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-[#9c5964]">#{tag}</span>)}
          </div>
          <h1 className="mt-4 text-3xl font-black leading-tight text-[#1a1a1a] sm:text-4xl">{title}</h1>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" aria-hidden="true" />{date.toLocaleDateString(useKinyarwanda ? 'rw-RW' : 'en-RW', { dateStyle: 'medium' })}</span>
            <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" aria-hidden="true" />{t('blog.views', { count: post.viewCount })}</span>
          </div>
          {excerpt && <p className="mt-6 border-l-4 border-[#B76E79] pl-4 text-lg leading-8 text-gray-700">{excerpt}</p>}
          <div className="prose prose-sm mt-8 max-w-none whitespace-pre-line leading-7 text-gray-800">{content}</div>
        </div>
      </article>
    </main>
  )
}
