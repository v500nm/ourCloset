'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div data-testid="root-error-boundary" className="min-h-screen bg-raw-silk flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient background blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-sindoor/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-md w-full text-center space-y-6 relative z-10">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-surface-container-lowest border border-sindoor/30 flex items-center justify-center shadow-xl">
            <span className="material-symbols-outlined text-4xl text-sindoor">error</span>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-7xl font-display font-bold text-primary tracking-tight">500</h1>
          <p className="text-xs font-mono text-sindoor uppercase tracking-[0.2em] font-bold">
            Twinning Engine Fault
          </p>
        </div>

        <p className="text-on-surface-variant text-sm leading-relaxed max-w-xs mx-auto font-body">
          A seam split or a coordinate mapping failed in our local inference matrix. The fault has been logged.
        </p>

        <div className="pt-6 flex flex-col items-center gap-3">
          <Button onClick={() => reset()} className="w-full max-w-[240px] justify-center py-3 bg-sindoor text-white hover:bg-error border-none">
            <span className="material-symbols-outlined text-sm">refresh</span>
            Re-align Interface
          </Button>
          
          <Link href="/" className="w-full max-w-[240px]">
            <Button variant="outline" className="w-full justify-center">
              <span className="material-symbols-outlined text-sm">home</span>
              Return to Core
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
