import React from 'react';
import { WardrobeItem } from '@/types';
import { ItemCard } from './ItemCard';

interface HangerRailProps {
  items: WardrobeItem[];
}

export const HangerRail: React.FC<HangerRailProps> = ({ items }) => {
  return (
    <div className="relative pt-5">
      {/* Horizontal Hanger Rail Line */}
      <div className="absolute top-2.5 left-0 right-0 h-[2px] bg-primary/30 z-0" />

      {/* Compact Rail Items Container */}
      <div className="flex overflow-x-auto gap-3 sm:gap-4 pb-3 no-scrollbar relative z-10">
        {items.map((item) => (
          <div key={item.id} className="flex-shrink-0 w-36 sm:w-40 md:w-44 relative pt-3">
            {/* Sleek Hanger Hook Top */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-3.5 border-t-2 border-l-2 border-r-2 border-primary/60 rounded-t-full z-20 pointer-events-none" />
            <ItemCard item={item} />
          </div>
        ))}
      </div>
    </div>
  );
};
