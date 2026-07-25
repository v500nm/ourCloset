import React from 'react';

/** Spec label — JetBrains Mono uppercase stamp per DESIGN.md §Typography. */
export const SpecLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <span className={`spec-label text-primary/60 ${className}`}>
      {children}
    </span>
  );
};
