'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Header from '@/components/Header/Header';
import { AuthGuard } from '@/components/AuthGuard';

interface ClientLayoutProps {
  children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith('/auth');

  // Don't wrap auth pages with AuthGuard
  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-all duration-300">
        <Header />
        <div className="relative">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-grid-pattern opacity-5 dark:opacity-10 pointer-events-none"></div>
          
          {/* Main Content */}
          <div className="relative z-10 pb-8">
            {children}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
