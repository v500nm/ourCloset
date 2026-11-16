'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useAuth } from '@/providers/AuthProvider';
import { SyncStatusIndicator } from '@/components/ui/SyncStatusIndicator';

export const Header: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const userNavItems = [
    { label: 'Today', href: '/today', icon: 'wb_sunny' },
    { label: 'Closet', href: '/closet', icon: 'checkroom' },
    { label: 'Laundry', href: '/laundry', icon: 'local_laundry_service' },
    { label: 'History', href: '/history', icon: 'history' },
    { label: 'Trip', href: '/trip', icon: 'flight' },
  ];

  const guestNavItems = [
    { label: 'Product', href: '/product', icon: 'info' },
    { label: 'Pricing', href: '/pricing', icon: 'sell' },
    { label: 'Testimonials', href: '/testimonials', icon: 'reviews' },
    { label: 'Contact', href: '/contact', icon: 'mail' },
  ];

  const currentNavItems = user ? userNavItems : guestNavItems;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Desktop Floating Navbar */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 z-50 justify-center p-6 pointer-events-none">
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className={`pointer-events-auto flex items-center gap-8 px-6 py-3 rounded-full transition-all duration-300 ${
            scrolled
              ? 'bg-surface/80 backdrop-blur-lg shadow-xl border border-outline-variant/40'
              : 'bg-surface/50 backdrop-blur-md shadow-lg border border-outline-variant/20'
          }`}
        >
          {/* Brand Logo */}
          <Link
            href="/"
            className="font-display text-xl text-primary hover:text-secondary transition-colors mr-2"
          >
            ourCloset
          </Link>

          {/* Nav Items */}
          <nav className="flex items-center gap-2">
            {currentNavItems.map((item) => {
              const isActive =
                pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-4 py-2 rounded-full font-body text-sm font-medium transition-colors flex items-center gap-2 group ${
                    isActive
                      ? 'text-on-secondary'
                      : 'text-on-surface-variant hover:text-primary hover:bg-surface-variant/50'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavBackground"
                      transition={
                        shouldReduceMotion
                          ? { duration: 0 }
                          : { type: 'spring' as const, stiffness: 350, damping: 30 }
                      }
                      className="absolute inset-0 bg-secondary rounded-full -z-10"
                    />
                  )}
                  <span
                    className={`material-symbols-outlined text-[18px] ${
                      isActive ? 'text-on-secondary' : 'text-on-surface-variant group-hover:text-primary'
                    }`}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Right Actions */}
          <div className="flex items-center pl-4 border-l border-outline-variant/30 gap-2">
            <SyncStatusIndicator showLabel={false} />
            {user ? (
              <>
                <Link
                  href="/setup"
                  className="text-on-surface-variant hover:text-primary hover:bg-surface-variant/50 p-2 rounded-full transition-colors flex items-center justify-center"
                  title="Household Settings"
                >
                  <span className="material-symbols-outlined text-xl">settings</span>
                </Link>
                <button
                  onClick={() => { logout(); router.push('/'); }}
                  className="text-on-surface-variant hover:text-sindoor hover:bg-sindoor/10 p-2 rounded-full transition-colors flex items-center justify-center"
                  title="Logout"
                >
                  <span className="material-symbols-outlined text-xl">logout</span>
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="bg-primary text-on-primary font-bold text-sm px-4 py-2 rounded-full hover:bg-primary/90 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </motion.div>
      </header>

      {/* Mobile Floating Header & Drawer */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 p-4 pointer-events-none">
        <div className="flex justify-between items-center pointer-events-auto bg-surface/80 backdrop-blur-lg shadow-lg border border-outline-variant/40 px-5 py-3 rounded-2xl">
          <Link href="/today" className="font-display text-xl text-primary">
            ourCloset
          </Link>
          <div className="flex items-center gap-2">
            <SyncStatusIndicator showLabel={false} />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center"
              aria-label="Toggle Menu"
            >
              <span className="material-symbols-outlined text-2xl">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="absolute top-[80px] left-4 right-4 pointer-events-auto bg-surface/95 backdrop-blur-xl shadow-2xl border border-outline-variant/30 rounded-2xl p-4 overflow-hidden"
            >
              <div className="space-y-2">
                {currentNavItems.map((item) => {
                    const isActive =
                      pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 w-full py-3 px-4 rounded-xl font-body text-base font-medium transition-colors ${
                          isActive
                            ? 'bg-secondary text-on-secondary shadow-md'
                            : 'text-on-surface-variant hover:bg-surface-variant hover:text-primary'
                        }`}
                      >
                        <span className="material-symbols-outlined text-xl">{item.icon}</span>
                        {item.label}
                      </Link>
                    );
                  }
                )}
                {user ? (
                  <>
                    <Link
                      href="/setup"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 w-full py-3 px-4 rounded-xl font-body text-base font-medium transition-colors text-on-surface-variant hover:bg-surface-variant hover:text-primary`}
                    >
                      <span className="material-symbols-outlined text-xl">settings</span>
                      Household Setup
                    </Link>
                    <button
                      onClick={() => { setMobileMenuOpen(false); logout(); router.push('/'); }}
                      className={`flex items-center gap-3 w-full py-3 px-4 rounded-xl font-body text-base font-medium transition-colors text-sindoor hover:bg-sindoor/10`}
                    >
                      <span className="material-symbols-outlined text-xl">logout</span>
                      Sign Out
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl font-body text-base font-bold transition-colors bg-primary text-on-primary`}
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
};
