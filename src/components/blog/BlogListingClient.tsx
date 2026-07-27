'use client'

import Link from 'next/link'
import { ArrowRight, BookOpen } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type BlogListPost = {
  slug: string
  title: string
  titleRw: string | null
  excerpt: string | null
  excerptRw: string | null
  category: string | null
  publishedAt: string | null
}

export default function BlogListingClient({ posts }: { posts: BlogListPost[] }) {
  const { language, t } = useLanguage()
  return (
    <main className="min-h-screen bg-[#f8f9fa] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="max-w-3xl">
          <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#8a4b55]"><BookOpen className="h-4 w-4" aria-hidden="true" />{t('blog.label')}</span>
          <h1 className="mt-3 text-3xl font-black text-gray-950 sm:text-4xl">{t('blog.section_title')}</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">{t('blog.section_subtitle')}</p>
        </header>

        {posts.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <p className="font-bold text-gray-800">{t('blog.no_posts')}</p>
          </section>
        ) : (
          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label={t('blog.section_title')}>
            {posts.map((post) => {
              const title = language === 'rw' && post.titleRw ? post.titleRw : post.title
              const excerpt = language === 'rw' && post.excerptRw ? post.excerptRw : post.excerpt
              return (
                <article key={post.slug} className="flex min-h-64 flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  {post.category && <span className="text-xs font-bold uppercase tracking-wide text-[#8a4b55]">{post.category}</span>}
                  <h2 className="mt-3 text-xl font-black leading-7 text-gray-950">{title}</h2>
                  {excerpt && <p className="mt-3 line-clamp-4 text-sm leading-6 text-gray-600">{excerpt}</p>}
                  {post.publishedAt && <time dateTime={post.publishedAt} className="mt-3 text-xs text-gray-500">{new Intl.DateTimeFormat(language === 'rw' ? 'rw-RW' : 'en-RW', { dateStyle: 'medium' }).format(new Date(post.publishedAt))}</time>}
                  <Link href={`/blog/${post.slug}`} className="mt-auto inline-flex min-h-12 items-center gap-2 pt-5 text-sm font-bold text-[#8a4b55]">{t('blog.read_more')}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                </article>
              )
            })}
          </section>
        )}
      </div>
    </main>
  )
}
