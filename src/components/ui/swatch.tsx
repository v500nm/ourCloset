import React from 'react';

/**
 * Twin Swatch — two overlapping circular color chips per UiUxBrief §2 "Signature Element".
 * Shown on Twinning-mode result cards to display matched color relationship.
 * Connected by a stitching dashed line between them.
 * Animate pin-together on match complete (150ms ease-out), instant under reduced-motion.
 */
export const TwinSwatch: React.FC<{
  colorA: string;
  colorB: string;
  labelA?: string;
  labelB?: string;
}> = ({ colorA, colorB, labelA, labelB }) => {
  return (
    <div className="relative flex items-center w-14 h-8" title={`${labelA || colorA} ↔ ${labelB || colorB}`}>
      <div
        className="w-8 h-8 rounded-full border-2 border-surface-container-lowest absolute left-0 z-10 motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out"
        style={{ backgroundColor: colorA }}
      />
      <div
        className="w-8 h-8 rounded-full border-2 border-surface-container-lowest absolute right-0 z-0 motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out"
        style={{ backgroundColor: colorB }}
      />
      {/* Stitching connection */}
      <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-6 h-[2px] border-b-[2px] border-dashed border-secondary/40 z-20" />
    </div>
  );
};
