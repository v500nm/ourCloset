'use client';

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

/**
 * Motion Button — motion.dev spring physics & tactile feedback per DESIGN.md.
 * Primary: brass bg, charcoal-thread text, sharp 4px radius.
 * Secondary: ink-bottle outline, no fill.
 * Danger: sindoor for festive/alert.
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  className = '',
  ...props
}) => {
  const shouldReduceMotion = useReducedMotion();

  const base =
    'px-6 py-3 rounded-full font-mono text-label-spec uppercase tracking-wider transition-all duration-300 shadow-sm hover:shadow-md tap-target focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 focus:ring-offset-surface flex items-center gap-2 cursor-pointer select-none';

  const variants = {
    primary: 'bg-secondary text-on-secondary hover:bg-primary',
    secondary: 'bg-primary-container text-on-primary hover:bg-primary',
    outline: 'border border-outline-variant/40 bg-surface text-on-surface hover:bg-surface-container-highest',
    danger: 'bg-sindoor text-white hover:bg-error',
  };

  const hoverMotion = shouldReduceMotion
    ? {}
    : { scale: 1.02, y: -1, transition: { type: 'spring' as const, stiffness: 400, damping: 25 } };

  const tapMotion = shouldReduceMotion ? {} : { scale: 0.97 };

  return (
    <motion.button
      whileHover={hoverMotion}
      whileTap={tapMotion}
      suppressHydrationWarning
      className={`${base} ${variants[variant]} ${className}`}
      {...(props as any)}
    >
      {children}
    </motion.button>
  );
};
