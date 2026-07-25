'use client';

import React from 'react';
import { CulturalStyle, CULTURAL_STYLES } from '@/types';

interface CulturalFilterProps {
  selectedStyle: CulturalStyle;
  onStyleChange: (style: CulturalStyle) => void;
}

export const CulturalFilter: React.FC<CulturalFilterProps> = ({ selectedStyle, onStyleChange }) => {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {CULTURAL_STYLES.map((st) => {
        const isSelected = selectedStyle === st.id;
        return (
          <button
            key={st.id}
            onClick={() => onStyleChange(st.id)}
            className={`px-5 py-2.5 rounded text-sm font-mono tracking-wider uppercase transition-colors flex items-center gap-2 ${
              isSelected
                ? 'bg-primary text-on-primary hard-shadow'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-secondary' : 'bg-outline-variant'}`} />
            {st.label}
          </button>
        );
      })}
    </div>
  );
};
