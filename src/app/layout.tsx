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
    <html lang="en" className="dark" suppressHydrationWarning={true}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                document.documentElement.classList.add('dark');
                document.documentElement.style.setProperty('--background', '#111827');
                document.documentElement.style.setProperty('--foreground', '#f9fafb');
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.className} bg-gray-900 text-gray-100`}>
        <AuthProvider>
          <ClientLayout>
            <main>{children}</main>
          </ClientLayout>
        </AuthProvider>
      </body>
    </html>
  )
}
