'use client';

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

const STATUS_OPTIONS = [
  { value: 'CLEAN', label: 'Clean', icon: 'check_circle' },
  { value: 'DIRTY', label: 'Dirty', icon: 'cancel' },
  { value: 'IN_WASH', label: 'In Wash', icon: 'water_drop' },
  { value: 'DRY_CLEANING', label: 'Dry Clean', icon: 'dry_cleaning' },
] as const;

export const StatusWheel: React.FC<{
  currentStatus: string;
  onStatusChange?: (status: string) => void;
}> = ({ currentStatus, onStatusChange }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="flex gap-1 bg-surface-container-high rounded p-1">
      {STATUS_OPTIONS.map((opt) => {
        const isSelected = currentStatus === opt.value;
        return (
          <motion.button
            key={opt.value}
            whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
            whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
            onClick={() => onStatusChange?.(opt.value)}
            className={`flex flex-col items-center px-3 py-2 rounded tap-target transition-colors text-label-spec font-mono cursor-pointer relative ${
              isSelected
                ? 'bg-surface-container-lowest border border-outline-variant/50 hard-shadow text-primary font-bold z-10'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[18px] mb-0.5">{opt.icon}</span>
            <span className="text-[10px] uppercase tracking-wider">{opt.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
};
