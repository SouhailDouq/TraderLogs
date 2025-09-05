import type { Metadata } from "next";
import { Inter } from 'next/font/google'
import './globals.css'
import ClientLayout from '@/components/Layout/ClientLayout'
import { AuthProvider } from '@/components/AuthProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TraderLogs - Trading Journal',
  description: 'Track and analyze your trading performance',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className={inter.className}>
        <AuthProvider>
          <ClientLayout>
            <main>{children}</main>
          </ClientLayout>
        </AuthProvider>
      </body>
    </html>
  )
}
