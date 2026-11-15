import React from 'react';
import type { WardrobeItem } from '@/types';

interface GarmentThumbProps {
  item: Pick<WardrobeItem, 'image_url' | 'title' | 'primary_color_hex'>;
  className?: string;
}

/**
 * Renders a garment photo, or a colour swatch when there is none.
 *
 * A partner's items arrive WITHOUT photos by design (ADR-002: photos never leave the owner's device), so
 * `image_url === ''` is a normal state, not an error. The swatch uses the item's primary colour so the
 * partner can still judge the pairing.
 */
export const GarmentThumb: React.FC<GarmentThumbProps> = ({ item, className = '' }) => {
  if (item.image_url) {
    return <img src={item.image_url} alt={item.title} className={className} />;
  }
  return (
    <div
      role="img"
      aria-label={`${item.title} (photo stays on the owner's device)`}
      className={`${className} flex items-center justify-center bg-surface-container-high`}
      style={item.primary_color_hex ? { backgroundColor: item.primary_color_hex } : undefined}
    >
      <span className="w-9 h-9 rounded-full bg-surface/85 flex items-center justify-center text-primary/70">
        <span className="material-symbols-outlined text-lg" aria-hidden="true">checkroom</span>
      </span>
    </div>
  );
};
