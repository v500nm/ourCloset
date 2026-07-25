'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-raw-silk flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background stitching details */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="max-w-md w-full text-center space-y-6 relative z-10">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-surface-container-lowest border border-secondary/40 flex items-center justify-center shadow-xl">
            <span className="material-symbols-outlined text-4xl text-secondary">checkroom</span>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-7xl font-display font-bold text-primary tracking-tight">404</h1>
          <p className="text-xs font-mono text-secondary uppercase tracking-[0.2em] font-bold">
            Wardrobe Section Misplaced
          </p>
        </div>

        <p className="text-on-surface-variant text-sm leading-relaxed max-w-xs mx-auto font-body">
          We searched all drawers, hangers, and laundry bins, but this section of the closet could not be found. It may have been cleared or archived.
        </p>

        <div className="pt-6 flex justify-center">
          <Link href="/">
            <Button className="hard-shadow">
              <span className="material-symbols-outlined text-sm">home</span>
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
