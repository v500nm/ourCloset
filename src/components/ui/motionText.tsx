'use client';

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface MotionTextProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
}

export const MotionText: React.FC<MotionTextProps> = ({
  children,
  className = '',
  delay = 0,
  as: Component = 'div',
}) => {
  const shouldReduceMotion = useReducedMotion();
  const MotionComponent = (motion as any)[Component] as React.ElementType;

  return (
    <MotionComponent
      initial={shouldReduceMotion ? false : { opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </MotionComponent>
  );
};

export const MotionContainer: React.FC<{
  children: React.ReactNode;
  className?: string;
  staggerChildren?: number;
}> = ({ children, className = '', staggerChildren = 0.1 }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : 'hidden'}
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      variants={{
        visible: {
          transition: {
            staggerChildren,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
