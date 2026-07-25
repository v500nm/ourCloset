'use client';

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

/**
 * Motion Badge — spec-label style mono badge per DESIGN.md.
 */
export const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'default' | 'brass' | 'sindoor' | 'mauve' | 'clean' | 'dirty' | 'wash' | 'dryclean';
}> = ({ children, variant = 'default' }) => {
  const shouldReduceMotion = useReducedMotion();

  const styles = {
    default: 'bg-surface-variant text-on-surface-variant',
    brass: 'bg-secondary-container text-on-secondary-container',
    sindoor: 'bg-error-container text-on-error-container',
    mauve: 'bg-tertiary-container text-on-tertiary-container',
    clean: 'bg-primary-fixed text-on-primary-fixed',
    dirty: 'bg-error-container text-on-error-container',
    wash: 'bg-secondary-fixed text-on-secondary-fixed',
    dryclean: 'bg-tertiary-fixed text-on-tertiary-fixed',
  };

  return (
    <motion.span
      initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`spec-label px-3 py-1 rounded inline-block ${styles[variant]}`}
    >
      {children}
    </motion.span>
  );
};
