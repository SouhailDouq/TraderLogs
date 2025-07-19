'use client';

import { ReactNode } from 'react';
import Header from '@/components/Header/Header';

interface ClientLayoutProps {
  children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}
