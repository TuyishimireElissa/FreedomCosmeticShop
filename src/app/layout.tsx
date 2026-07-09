import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "FreedomCosmeticShop — Rwanda's Cosmetics Store",
  description:
    "Shop skincare, makeup & haircare products in Rwanda. Pay with MTN MoMo or cash on delivery. Fast delivery in Kigali and across all provinces.",
  keywords: [
    "cosmetics Rwanda",
    "skincare Kigali",
    "makeup Rwanda",
    "haircare Rwanda",
    "beauty products Rwanda",
    "FreedomCosmeticShop",
    "MTN MoMo shopping Rwanda",
  ],
  authors: [{ name: "FreedomCosmeticShop" }],
  openGraph: {
    title: "FreedomCosmeticShop — Rwanda's Cosmetics Store",
    description:
      "Shop skincare, makeup & haircare products in Rwanda. Pay with MTN MoMo or cash on delivery.",
    siteName: "FreedomCosmeticShop",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FreedomCosmeticShop — Rwanda's Cosmetics Store",
    description:
      "Shop skincare, makeup & haircare products in Rwanda. Pay with MTN MoMo or cash on delivery.",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Theme initialization script — runs before React hydration to prevent FOUC */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('freedom-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}if(t==='dark'){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark'}}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  )
}
