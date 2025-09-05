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
      <Header />
      {children}
    </AuthGuard>
  );
}
