'use client';

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

export type BadgeVariant =
  | 'default'
  | 'brass'
  | 'sindoor'
  | 'mauve'
  | 'clean'
  | 'dirty'
  | 'wash'
  | 'dryclean';

const STATUS_ICONS: Partial<Record<BadgeVariant, string>> = {
  clean: 'check_circle',
  dirty: 'cancel',
  wash: 'water_drop',
  dryclean: 'dry_cleaning',
};

/**
 * Motion Badge — spec-label style mono badge per DESIGN.md.
 * Ensures WCAG 2.2 AA non-color redundancy by embedding icon glyphs alongside color for status variants.
 */
export const Badge: React.FC<{
  children?: React.ReactNode;
  variant?: BadgeVariant;
  icon?: string;
  className?: string;
}> = ({ children, variant = 'default', icon, className = '' }) => {
  const shouldReduceMotion = useReducedMotion();

  const styles: Record<BadgeVariant, string> = {
    default: 'bg-surface-variant text-on-surface-variant',
    brass: 'bg-secondary-container text-on-secondary-container',
    sindoor: 'bg-error-container text-on-error-container',
    mauve: 'bg-tertiary-container text-on-tertiary-container',
    clean: 'bg-primary-fixed text-on-primary-fixed',
    dirty: 'bg-error-container text-on-error-container',
    wash: 'bg-secondary-fixed text-on-secondary-fixed',
    dryclean: 'bg-tertiary-fixed text-on-tertiary-fixed',
  };

  const glyph = icon || STATUS_ICONS[variant];

  return (
    <motion.span
      initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`spec-label px-2.5 py-1 rounded inline-flex items-center gap-1.5 font-mono text-[11px] font-bold ${styles[variant]} ${className}`}
    >
      {glyph && (
        <span
          className="material-symbols-outlined text-[13px] leading-none shrink-0"
          aria-hidden="true"
        >
          {glyph}
        </span>
      )}
      <span>{children}</span>
    </motion.span>
  );
};
