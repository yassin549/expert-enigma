import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { QueryProvider } from '@/components/providers/query-provider'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Topcoin - Simulated Trading Platform | CMF Licensed & MSB Registered',
  description: 'Access financial markets through our fully simulated trading platform. CMF licensed and MSB registered. Trade forex, crypto, stocks, and indices with professional tools.',
  keywords: 'simulated trading, forex, crypto trading, CMF licensed, MSB registered, financial markets',
  authors: [{ name: 'Topcoin' }],
  creator: 'Topcoin',
  publisher: 'Topcoin',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://topcoin.com',
    title: 'Topcoin - Simulated Trading Platform',
    description: 'CMF licensed and MSB registered trading platform',
    siteName: 'Topcoin',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Topcoin - Simulated Trading Platform',
    description: 'CMF licensed and MSB registered trading platform',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
