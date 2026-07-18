import type { MetadataRoute } from 'next'
import { SEO_CONFIG } from '@/lib/seo-config'

export default function robots(): MetadataRoute.Robots {
  const privatePaths = [
    '/admin',
    '/admin/',
    '/account',
    '/account/',
    '/api',
    '/api/',
    '/cart',
    '/checkout',
    '/checkout/',
    '/login',
    '/register',
    '/forgot-password',
    '/change-password',
    '/*?*search=*',
    '/*?*q=*',
    '/*?*utm_*',
  ]

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: privatePaths },
      { userAgent: 'GPTBot', disallow: '/' },
      { userAgent: 'CCBot', disallow: '/' },
    ],
    sitemap: `${SEO_CONFIG.siteUrl}/sitemap.xml`,
    host: SEO_CONFIG.siteUrl,
  }
}
