'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { AdminForbiddenView } from './AdminForbiddenView';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/admin');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-primary animate-spin">
            progress_activity
          </span>
          <p className="text-xs font-mono uppercase tracking-widest text-on-surface-variant">
            Verifying Credentials...
          </p>
        </div>
      </div>
    );
  }

  // F-01: Non-admin or unauthenticated access blocked strictly without client-forgeable domain shortcuts
  const isAdmin = user && !user.isGuest && user.role === 'admin';

  if (!isAdmin) {
    return <AdminForbiddenView />;
  }

  return <>{children}</>;
}
