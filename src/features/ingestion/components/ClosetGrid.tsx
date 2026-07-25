import React from 'react';
import { WardrobeItem } from '@/types';
import { ItemCard } from './ItemCard';
import { CardSkeleton } from '@/components/ui/skeleton';

interface ClosetGridProps {
  items: WardrobeItem[];
  loading?: boolean;
  onStatusClick?: (itemId: string) => void;
  onDeleteClick?: (itemId: string) => void;
  onAddItem?: () => void;
}

export const ClosetGrid: React.FC<ClosetGridProps> = ({ items, loading = false, onStatusClick, onDeleteClick, onAddItem }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
        {[...Array(6)].map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-8 text-center bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-sm">
        <span className="material-symbols-outlined text-4xl text-primary/40 mb-2">checkroom</span>
        <h3 className="font-display text-body-md text-primary font-bold">Cupboard Section Empty</h3>
        <p className="text-body-sm text-on-surface-variant max-w-sm mx-auto mt-1">
          No garments match the selected category filter. Tap the plus button to add items to your local cupboard.
        </p>
      </div>
    );
  }

    <div className="relative">
      <div className="flex justify-end mb-4">
        {onAddItem && (
          <button 
            onClick={onAddItem}
            className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded shadow-sm hover:bg-primary/90 transition-colors font-bold text-sm"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Add Mock Garment
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            onStatusClick={() => onStatusClick?.(item.id)}
            onDeleteClick={() => onDeleteClick?.(item.id)}
          />
        ))}
      </div>
    </div>
};
