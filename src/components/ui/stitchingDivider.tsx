import React from 'react';

/** Stitching divider — dashed seam line per DESIGN.md (dash: 4px, gap: 2px). */
export const StitchingDivider: React.FC<{ className?: string }> = ({ className = '' }) => {
  return <div className={`stitching-border-full ${className}`} />;
};

/** Short stitching accent — 64px wide version used in section headers (prototype: today_mode_selector). */
export const StitchingAccent: React.FC<{ className?: string; centered?: boolean }> = ({
  className = '',
  centered = false,
}) => {
  return (
    <div
      className={`stitching-border w-16 ${centered ? 'mx-auto' : ''} ${className}`}
    />
  );
};
