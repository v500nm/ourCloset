'use client';

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

export const STATUS_OPTIONS = [
  { value: 'CLEAN', label: 'Clean', icon: 'check_circle' },
  { value: 'DIRTY', label: 'Dirty', icon: 'cancel' },
  { value: 'IN_WASH', label: 'In Wash', icon: 'water_drop' },
  { value: 'DRY_CLEANING', label: 'Dry Clean', icon: 'dry_cleaning' },
] as const;

export const StatusWheel: React.FC<{
  currentStatus: string;
  onStatusChange?: (status: string) => void;
  ariaLabel?: string;
}> = ({ currentStatus, onStatusChange, ariaLabel = 'Laundry status selector' }) => {
  const shouldReduceMotion = useReducedMotion();

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = (index + 1) % STATUS_OPTIONS.length;
      onStatusChange?.(STATUS_OPTIONS[nextIdx].value);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIdx = (index - 1 + STATUS_OPTIONS.length) % STATUS_OPTIONS.length;
      onStatusChange?.(STATUS_OPTIONS[prevIdx].value);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onStatusChange?.(STATUS_OPTIONS[index].value);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex gap-1 bg-surface-container-high rounded p-1"
    >
      {STATUS_OPTIONS.map((opt, idx) => {
        const isSelected = currentStatus === opt.value;
        return (
          <motion.button
            key={opt.value}
            role="radio"
            aria-checked={isSelected}
            aria-label={`Mark as ${opt.label}`}
            tabIndex={isSelected ? 0 : -1}
            whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
            whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
            onClick={() => onStatusChange?.(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`flex flex-col items-center px-3 py-2 rounded tap-target transition-colors text-label-spec font-mono cursor-pointer relative focus-visible:ring-2 focus-visible:ring-secondary focus-visible:outline-none focus:outline-none focus-visible:ring-offset-1 ${
              isSelected
                ? 'bg-surface-container-lowest border border-outline-variant/50 hard-shadow text-primary font-bold z-10 ring-1 ring-secondary/30'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[18px] mb-0.5" aria-hidden="true">
              {opt.icon}
            </span>
            <span className="text-[10px] uppercase tracking-wider">{opt.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
};
