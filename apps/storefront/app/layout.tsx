import type { Metadata } from 'next'
import { Cormorant_Garamond, Inter } from 'next/font/google'
import { AuthProvider } from '../context/auth-context'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Swappa — Interchangeable Heels',
    template: '%s — Swappa',
  },
  description: 'Design your perfect heel. Change your look in seconds.',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Swappa',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable}`}>
      <body className="font-sans bg-background text-foreground antialiased min-h-screen">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
