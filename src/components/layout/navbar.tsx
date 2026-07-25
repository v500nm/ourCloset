import React from 'react';
import Link from 'next/link';

export const Navbar: React.FC = () => {
  const navItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Wardrobe', href: '/wardrobe' },
    { label: 'Matching', href: '/matching' },
    { label: 'History', href: '/history' },
    { label: 'Household', href: '/household' },
    { label: 'Analytics', href: '/analytics' },
  ];

  return (
    <nav className="w-64 border-r border-slate-800 bg-slate-950 p-4 min-h-[calc(100vh-4rem)] flex flex-col gap-2">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="px-4 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900 font-medium text-sm transition-colors"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
};
