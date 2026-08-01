import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import Providers from '@/components/Providers'
import SiteChrome from '@/components/layout/SiteChrome'
import SkipToContent from '@/components/a11y/SkipToContent'
import LiveAnnouncer from '@/components/a11y/LiveAnnouncer'
import { LowDataProvider } from '@/contexts/LowDataContext'
import OfflineBanner from '@/components/ui/OfflineBanner'
import { AnalyticsConsentBanner } from '@/components/analytics/AnalyticsConsent'
import VisitorTracker from '@/components/visitors/VisitorTracker'
import PerformanceMonitor from '@/components/dev/PerformanceMonitor'
import { BUSINESS } from '@/lib/business-config'
import { getPageMetadata, SEO_CONFIG } from '@/lib/seo-config'
import StructuredData from '@/components/seo/StructuredData'
import { getLocalBusinessSchema, getOrganizationSchema, getWebsiteSchema } from '@/lib/structured-data'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  // Next 15 renders <meta name="theme-color"> from the viewport export.
  // Declaring it under `metadata` instead triggers a build-time warning.
  themeColor: '#B76E79',
}

export const metadata: Metadata = {
  metadataBase: new URL(SEO_CONFIG.siteUrl),
  ...getPageMetadata({ path: '/' }),
  authors: [{ name: BUSINESS.name }],
  creator: BUSINESS.name,
  publisher: BUSINESS.name,
  applicationName: BUSINESS.tradingName,
  manifest: '/site.webmanifest',
  // Next emits the matching <link rel> tags; hand-writing them in <head> as
  // well would duplicate every icon declaration.
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/android-chrome-192x192.png', type: 'image/png', sizes: '192x192' },
      { url: '/android-chrome-512x512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    shortcut: ['/favicon.ico'],
  },
  appleWebApp: {
    capable: true,
    title: BUSINESS.tradingName,
    statusBarStyle: 'default',
  },
  // Search engines only crawl a site they know exists. Paste the tokens from
  // Google Search Console and Bing Webmaster Tools into these env vars; the
  // tags are omitted entirely when the vars are unset.
  verification: {
    ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
      : {}),
    ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { other: { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION } }
      : {}),
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="rw">
      <body className="bg-white font-sans text-[#1a1a1a] antialiased">
        <StructuredData data={[getOrganizationSchema(), getLocalBusinessSchema(), getWebsiteSchema()]} />
        <LowDataProvider>
          <Providers>
            <SkipToContent />
            <LiveAnnouncer />
            <OfflineBanner />
            <AnalyticsConsentBanner />
            <VisitorTracker />
            <SiteChrome>{children}</SiteChrome>
            {process.env.NODE_ENV === 'development' && <PerformanceMonitor />}
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3000,
                style: {
                  background: '#1a1a1a',
                  color: '#ffffff',
                  borderRadius: '12px',
                  padding: '12px 18px',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.16)',
                },
              }}
            />
          </Providers>
        </LowDataProvider>
      </body>
    </html>
  )
}
