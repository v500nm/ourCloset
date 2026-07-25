'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';

/**
 * Mobile bottom tab bar — 5 tabs with active route highlighting.
 * Uses Material Symbols icons matching prototype HTML.
 * Minimum 44×44pt tap targets per accessibility spec.
 */

const tabs = [
  { label: 'Today', href: '/today', icon: 'calendar_today' },
  { label: 'Closet', href: '/closet', icon: 'checkroom' },
  { label: 'Laundry', href: '/laundry', icon: 'local_laundry_service' },
  { label: 'History', href: '/history', icon: 'history' },
  { label: 'Setup', href: '/setup', icon: 'house' },
];

export const TabBar: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 h-16 bg-surface rounded-t-xl border-t border-dashed border-outline-variant shadow-lg">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center justify-center font-mono text-label-spec w-1/5 tap-target transition-colors ${
              isActive
                ? 'text-primary font-bold bg-secondary-container/40 rounded-lg py-1'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-lg mb-0.5">{tab.icon}</span>
            <span className="text-[10px]">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
