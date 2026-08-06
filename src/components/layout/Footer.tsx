'use client';

import React from 'react';
import Link from 'next/link';
import { Mail, MapPin, Globe } from 'lucide-react';

const GithubIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const LinkedinIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-dashed border-outline-variant/40 bg-surface-container-low/30 py-12 mt-auto" id="site-footer">
      <div className="max-w-container mx-auto px-margin-mobile md:px-margin-desktop">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">

          {/* Brand Column */}
          <div className="space-y-4">
            <Link href="/" className="font-display font-bold text-lg text-primary hover:text-secondary transition-colors">
              ourCloset
            </Link>
            <p className="text-xs text-on-surface-variant leading-relaxed max-w-xs font-body">
              Client-side AI wardrobe coordination engine for multi-cultural and modern households. Coordinate ensembles offline with 100% data privacy.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-primary mb-4">ourCloset</h4>
            <ul className="space-y-2 text-xs font-body text-on-surface-variant">
              <li><Link href="/product" className="hover:text-secondary transition-colors">Product Details</Link></li>
              <li><Link href="/pricing" className="hover:text-secondary transition-colors">Subscription Plans</Link></li>
              <li><Link href="/testimonials" className="hover:text-secondary transition-colors">Loved by Couples</Link></li>
              <li><Link href="/demo" className="hover:text-secondary transition-colors">Interactive Tour</Link></li>
            </ul>
          </div>

          {/* Adnan Network */}
          <div>
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-primary mb-4">Adnan Network</h4>
            <ul className="space-y-2 text-xs font-body text-on-surface-variant">
              <li>
                <a href="https://adnan-mangaonkar.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-secondary transition-colors">
                  <Globe className="w-3.5 h-3.5" /> Adnan OS (Portfolio)
                </a>
              </li>
              <li>
                <a href="https://business.adnan-mangaonkar.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-secondary transition-colors">
                  <Globe className="w-3.5 h-3.5" /> Enterprise Strategy
                </a>
              </li>
              <li>
                <a href="https://sortstory.adnan-mangaonkar.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-secondary transition-colors">
                  <Globe className="w-3.5 h-3.5" /> SortStory Visualizer
                </a>
              </li>
            </ul>
          </div>

          {/* Contact & Bio */}
          <div>
            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-primary mb-4">Contact</h4>
            <ul className="space-y-2 text-xs font-body text-on-surface-variant">
              <li>
                <a href="mailto:adnans0307@gmail.com" className="flex items-center gap-2 hover:text-secondary transition-colors">
                  <Mail className="w-3.5 h-3.5" /> adnans0307@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-on-surface-variant/70" /> Mumbai, India
              </li>
              <li className="flex items-center gap-3 pt-2">
                <a href="https://github.com/v500nm" target="_blank" rel="noopener noreferrer" className="hover:text-secondary transition-colors" title="GitHub">
                  <GithubIcon />
                </a>
                <a href="https://www.linkedin.com/in/adnan-mangaonkar/" target="_blank" rel="noopener noreferrer" className="hover:text-secondary transition-colors" title="LinkedIn">
                  <LinkedinIcon />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Seam / Copyright Info */}
        <div className="pt-6 border-t border-dashed border-outline-variant/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-on-surface-variant font-mono">
          <div>
            © {currentYear} <a href="https://adnan-mangaonkar.com" target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">Adnan Shafiq Mangaonkar</a>. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-secondary transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-secondary transition-colors">Terms of Service</Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Available for freelance contracts</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
