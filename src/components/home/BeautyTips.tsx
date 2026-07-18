"use client"

/**
 * BeautyTips — blog post preview cards for the home page.
 *
 * Features:
 *   - 3-column grid (desktop), 1-column (mobile)
 *   - Cover image, title, excerpt, tags, read time
 *   - Hover lift effect
 *   - "Read more" link
 *
 * In the MVP, clicking a post does nothing (no blog detail page yet).
 * Future: navigate to /blog/[slug] view.
 */

import Link from "next/link"
import { Clock, ArrowRight, BookOpen } from "lucide-react"
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface BlogPost {
  id: string
  title: string
  titleRw?: string | null
  slug: string
  excerpt: string | null
  excerptRw?: string | null
  coverImage: string | null
  imageAlt?: string | null
  imageAltRw?: string | null
  tags: string[]
  publishedAt: string | null
  viewCount: number
}

interface BeautyTipsProps {
  posts: BlogPost[]
}

export function BeautyTips({ posts }: BeautyTipsProps) {
  const { language, t } = useLanguage()
  const useKinyarwanda = language === 'rw'
  if (posts.length === 0) return null

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-primary">
              {t('blog.label')}
            </span>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t('blog.section_title')}
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('blog.section_subtitle')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
        {posts.map((post) => {
          const title = useKinyarwanda && post.titleRw ? post.titleRw : post.title
          const excerpt = useKinyarwanda && post.excerptRw ? post.excerptRw : post.excerpt
          const imageAlt = useKinyarwanda ? post.imageAltRw || post.titleRw || post.imageAlt || post.title : post.imageAlt || post.title
          return <article
            key={post.id}
            className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
          >
            {/* Cover image */}
            <div className="relative aspect-video overflow-hidden bg-secondary/30">
              {post.coverImage ? (
                <img
                  src={post.coverImage}
                  alt={imageAlt}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-muted-foreground">
                  <BookOpen className="h-10 w-10" aria-hidden="true" />
                </div>
              )}
              {/* Tags */}
              {post.tags.length > 0 && (
                <div className="absolute left-3 top-3 flex flex-wrap gap-1">
                  {post.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-foreground backdrop-blur"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col p-4 sm:p-5">
              <h3 className="line-clamp-2 text-base font-semibold leading-snug sm:text-lg">
                {title}
              </h3>
              {excerpt && (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {excerpt}
                </p>
              )}

              {/* Meta */}
              <div className="mt-auto flex items-center justify-between pt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {post.publishedAt
                    ? new Date(post.publishedAt).toLocaleDateString(useKinyarwanda ? 'rw-RW' : 'en-RW', {
                        day: "numeric",
                        month: "short",
                      })
                    : t('blog.recent')}
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" aria-hidden="true" />
                  {t('blog.views', { count: post.viewCount })}
                </span>
              </div>

              <Link
                href={`/blog/${post.slug}`}
                className="mt-3 inline-flex items-center text-sm font-bold text-primary hover:underline"
              >
                {t('blog.read_more')}
                <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </article>
        })}
      </div>
    </section>
  )
}
