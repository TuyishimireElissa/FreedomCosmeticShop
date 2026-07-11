import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: {
    default: "FreedomCosmeticShop | Rwanda Beauty Store",
    template: "%s | FreedomCosmeticShop",
  },
  description:
    "Rwanda's #1 cosmetics store. Shop authentic skincare, makeup & haircare. Pay with MTN MoMo. Fast delivery across Rwanda.",
  keywords: [
    "cosmetics Rwanda",
    "beauty products Kigali",
    "MTN MoMo shopping",
    "skincare Rwanda",
    "FreedomCosmeticShop",
  ],
  authors: [{ name: "FreedomCosmeticShop" }],
  creator: "FreedomCosmeticShop",
  openGraph: {
    type: "website",
    locale: "en_RW",
    siteName: "FreedomCosmeticShop",
    title: "FreedomCosmeticShop | Rwanda Beauty Store",
    description: "Rwanda's #1 cosmetics store. Shop authentic skincare, makeup & haircare.",
  },
  twitter: {
    card: "summary_large_image",
    title: "FreedomCosmeticShop",
    description: "Rwanda's #1 cosmetics store",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} bg-background text-foreground antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
