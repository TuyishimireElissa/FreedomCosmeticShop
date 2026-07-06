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
  title: "Ubumwe Beauty — Rwanda's Cosmetics Store",
  description:
    "Shop skincare, makeup & haircare products in Rwanda. Pay with MTN MoMo or cash on delivery. Fast delivery in Kigali and across all provinces.",
  keywords: [
    "cosmetics Rwanda",
    "skincare Kigali",
    "makeup Rwanda",
    "haircare Rwanda",
    "beauty products Rwanda",
    "Ubumwe Beauty",
    "MTN MoMo shopping Rwanda",
  ],
  authors: [{ name: "Ubumwe Beauty" }],
  openGraph: {
    title: "Ubumwe Beauty — Rwanda's Cosmetics Store",
    description:
      "Shop skincare, makeup & haircare products in Rwanda. Pay with MTN MoMo or cash on delivery.",
    siteName: "Ubumwe Beauty",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ubumwe Beauty — Rwanda's Cosmetics Store",
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  )
}
