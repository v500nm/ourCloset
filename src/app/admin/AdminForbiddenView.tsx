'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components';

export function AdminForbiddenView() {
  return (
    <div
      data-testid="admin-403-forbidden"
      className="min-h-screen bg-raw-silk flex flex-col items-center justify-center p-6 text-center"
    >
      <div className="max-w-md w-full bg-surface-container-lowest p-8 rounded-2xl border border-sindoor/30 shadow-xl space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-sindoor/10 border border-sindoor/30 flex items-center justify-center text-sindoor">
          <span className="material-symbols-outlined text-3xl">lock</span>
        </div>
        <div>
          <h1 className="text-4xl font-display font-bold text-primary tracking-tight">403</h1>
          <p className="text-xs font-mono uppercase tracking-[0.2em] font-bold text-sindoor mt-1">
            Access Restricted • Admin Role Required
          </p>
        </div>
        <p className="text-sm text-on-surface-variant font-body">
          You do not have administrative clearance to access the ourCloset Governance Matrix.
          This area is strictly restricted to verified administrators.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link href="/login" className="flex-1">
            <Button className="w-full justify-center bg-primary text-on-primary">
              <span className="material-symbols-outlined text-sm">login</span>
              Sign In as Admin
            </Button>
          </Link>
          <Link href="/today" className="flex-1">
            <Button variant="outline" className="w-full justify-center">
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

