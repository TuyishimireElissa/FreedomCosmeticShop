import type { MetadataRoute } from 'next'
import { BUSINESS } from '@/lib/business-config'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = BUSINESS.url
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin/', '/api/', '/account/', '/cart', '/checkout', '/login', '/register', '/forgot-password'] },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
