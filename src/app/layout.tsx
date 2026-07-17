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
import PerformanceMonitor from '@/components/dev/PerformanceMonitor'
import { BUSINESS } from '@/lib/business-config'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  title: {
    default: `${BUSINESS.name} | Rwanda Beauty Store 🇷🇼`,
    template: `%s | ${BUSINESS.name}`,
  },
  description: BUSINESS.description,
  keywords: [
    'cosmetics Rwanda',
    'beauty products Kigali',
    'MTN MoMo shopping Rwanda',
    'skincare Rwanda',
    BUSINESS.name,
    'authentic beauty products',
    'online beauty store Rwanda',
  ],
  authors: [{ name: BUSINESS.name }],
  creator: BUSINESS.name,
  publisher: BUSINESS.name,
  metadataBase: new URL(BUSINESS.url),
  openGraph: {
    type: 'website',
    locale: 'rw_RW',
    siteName: BUSINESS.name,
    title: `${BUSINESS.name} | Rwanda Beauty Store`,
    description: BUSINESS.description,
    url: BUSINESS.url,
  },
  twitter: {
    card: 'summary_large_image',
    title: BUSINESS.name,
    description: BUSINESS.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="rw">
      <body className={`${inter.className} bg-white text-[#1a1a1a] antialiased`}>
        <LowDataProvider>
          <Providers>
            <SkipToContent />
            <LiveAnnouncer />
            <OfflineBanner />
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
