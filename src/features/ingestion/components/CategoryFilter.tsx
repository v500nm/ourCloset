'use client';

import React from 'react';
import { CATEGORIES, ItemCategory } from '@/types';

interface CategoryFilterProps {
  selectedCategory: ItemCategory | 'all';
  onCategoryChange: (category: ItemCategory | 'all') => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onCategoryChange,
}) => {
  return (
    <div className="flex overflow-x-auto gap-2 pb-3 no-scrollbar my-4">
      <button
        onClick={() => onCategoryChange('all')}
        className={`px-4 py-2 rounded font-mono text-label-spec uppercase tracking-wider transition-colors flex items-center gap-1.5 flex-shrink-0 ${
          selectedCategory === 'all'
            ? 'bg-secondary text-on-secondary font-bold hard-shadow'
            : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
        }`}
      >
        <span className="material-symbols-outlined text-sm">grid_view</span>
        All Cupboard Items
      </button>

      {CATEGORIES.map((cat) => {
        const isSelected = selectedCategory === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={`px-3.5 py-2 rounded font-mono text-label-spec uppercase tracking-wider transition-colors flex items-center gap-1.5 flex-shrink-0 ${
              isSelected
                ? 'bg-secondary text-on-secondary font-bold hard-shadow'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{cat.icon}</span>
            {cat.label}
          </button>
        );
      })}
    </div>
  );
};
