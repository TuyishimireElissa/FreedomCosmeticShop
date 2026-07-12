import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import Providers from '@/components/Providers'
import SiteChrome from '@/components/layout/SiteChrome'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: {
    default: 'FreedomCosmeticShop | Rwanda Beauty Store 🇷🇼',
    template: '%s | FreedomCosmeticShop',
  },
  description:
    "Rwanda's #1 cosmetics store. Shop authentic skincare, makeup & haircare. Pay with MTN MoMo. Fast delivery to all 30 districts.",
  keywords: [
    'cosmetics Rwanda',
    'beauty Kigali',
    'MTN MoMo shopping',
    'skincare Rwanda',
  ],
  openGraph: {
    type: 'website',
    siteName: 'FreedomCosmeticShop',
    title: 'FreedomCosmeticShop | Rwanda Beauty Store',
    description: "Rwanda's #1 cosmetics store",
    locale: 'en_RW',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-[#1a1a1a] antialiased`}>
        <Providers>
          <SiteChrome>{children}</SiteChrome>
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
      </body>
    </html>
  )
}
