'use client';

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

/**
 * Motion Card — motion.dev scroll reveal & elevation per DESIGN.md.
 * Uses torn-swatch clip-path (notched corner) and hard shadow.
 */
export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  tornSwatch?: boolean;
  animateIn?: boolean;
}> = ({ children, className = '', tornSwatch = false, animateIn = true }) => {
  const shouldReduceMotion = useReducedMotion();

  const motionProps =
    animateIn && !shouldReduceMotion
      ? {
          initial: { opacity: 0, y: 14 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.1 },
          transition: { duration: 0.4, ease: 'easeOut' as const },
        }
      : {};

  return (
    <motion.div
      {...motionProps}
      className={`bg-surface/80 backdrop-blur-md border border-outline-variant/30 p-6 ${
        tornSwatch ? 'torn-swatch' : 'rounded-2xl'
      } hard-shadow ${className}`}
    >
      {children}
    </motion.div>
  );
};
