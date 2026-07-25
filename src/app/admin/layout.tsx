'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/today');
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <p className="spec-label text-primary animate-pulse">Verifying Access...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-body">
      {/* Admin specific header could go here */}
      <header className="bg-slate-950 border-b border-slate-800 p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">admin_panel_settings</span>
          <h1 className="font-display font-bold text-lg text-white tracking-wide">ourCloset <span className="text-secondary">Admin</span></h1>
        </div>
        <button onClick={() => router.push('/today')} className="spec-label text-xs text-slate-400 hover:text-white transition-colors">
          Exit Dashboard
        </button>
      </header>
      <main className="flex-1 p-6 lg:p-10">
        {children}
      </main>
    </div>
  );
}
