import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import Providers from '@/components/Providers'
import SiteChrome from '@/components/layout/SiteChrome'
import SkipToContent from '@/components/a11y/SkipToContent'
import LiveAnnouncer from '@/components/a11y/LiveAnnouncer'
import { LowDataProvider } from '@/contexts/LowDataContext'
import OfflineBanner from '@/components/ui/OfflineBanner'
import { AnalyticsConsentBanner } from '@/components/analytics/AnalyticsConsent'
import PerformanceMonitor from '@/components/dev/PerformanceMonitor'
import { BUSINESS } from '@/lib/business-config'
import { getPageMetadata, SEO_CONFIG } from '@/lib/seo-config'
import StructuredData from '@/components/seo/StructuredData'
import { getLocalBusinessSchema, getOrganizationSchema, getWebsiteSchema } from '@/lib/structured-data'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  metadataBase: new URL(SEO_CONFIG.siteUrl),
  ...getPageMetadata({ path: '/' }),
  authors: [{ name: BUSINESS.name }],
  creator: BUSINESS.name,
  publisher: BUSINESS.name,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="rw">
      <body className={`${inter.className} bg-white text-[#1a1a1a] antialiased`}>
        <StructuredData data={[getOrganizationSchema(), getLocalBusinessSchema(), getWebsiteSchema()]} />
        <LowDataProvider>
          <Providers>
            <SkipToContent />
            <LiveAnnouncer />
            <OfflineBanner />
            <AnalyticsConsentBanner />
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
