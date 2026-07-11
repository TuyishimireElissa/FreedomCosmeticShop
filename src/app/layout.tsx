import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import Providers from '@/components/Providers'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import WhatsAppButton from '@/components/ui/WhatsAppButton'
import AnnouncementBar from '@/components/layout/AnnouncementBar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'FreedomCosmeticShop | Rwanda Beauty Store 🇷🇼',
    template: '%s | FreedomCosmeticShop'
  },
  description: "Rwanda's #1 cosmetics store. Shop authentic skincare, makeup & haircare. Pay with MTN MoMo. Fast delivery to all 30 districts.",
  keywords: ['cosmetics Rwanda', 'beauty Kigali', 'MTN MoMo shopping', 'skincare Rwanda'],
  openGraph: {
    type: 'website',
    siteName: 'FreedomCosmeticShop',
    title: 'FreedomCosmeticShop | Rwanda Beauty Store',
    description: "Rwanda's #1 cosmetics store",
    locale: 'en_RW',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-gray-900`}>
        <Providers>
          <AnnouncementBar />
          <Navbar />
          <main className="min-h-screen">
            {children}
          </main>
          <Footer />
          <WhatsAppButton />
          <Toaster 
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#1a1a1a',
                color: '#fff',
                borderRadius: '10px',
                padding: '12px 20px',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
