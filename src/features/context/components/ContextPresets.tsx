'use client';

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ContextPreset, EventSubContext } from '../types/context.types';

interface ContextPresetsProps {
  selectedPreset: ContextPreset;
  selectedSubPreset?: EventSubContext;
  onPresetChange: (preset: ContextPreset, subPreset?: EventSubContext) => void;
}

const PRESETS: { id: ContextPreset; label: string; icon: string }[] = [
  { id: 'Office', label: 'Office', icon: 'work' },
  { id: 'Casual', label: 'Casual', icon: 'coffee' },
  { id: 'House', label: 'House', icon: 'chair' },
  { id: 'Event', label: 'Event', icon: 'celebration' },
  { id: 'Trip', label: 'Trip', icon: 'flight' },
];

const SUB_PRESETS: EventSubContext[] = ['Sangeet', 'Eid', 'Gala', 'Wedding', 'Other'];

export const ContextPresets: React.FC<ContextPresetsProps> = ({
  selectedPreset,
  selectedSubPreset = 'Sangeet',
  onPresetChange,
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="mb-12">
      <h2 className="spec-label text-primary/70 mb-4 uppercase tracking-wider block">Select Context</h2>
      
      {/* Main preset options */}
      <div className="flex overflow-x-auto gap-3 pb-4 no-scrollbar">
        {PRESETS.map((p) => {
          const isSelected = selectedPreset === p.id;
          return (
            <motion.button
              key={p.id}
              id={`demo-${p.id.toLowerCase()}-btn`}
              suppressHydrationWarning
              whileHover={shouldReduceMotion ? {} : { scale: 1.03 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.96 }}
              onClick={() => onPresetChange(p.id)}
              className={`flex-shrink-0 px-6 py-3 border rounded transition-colors spec-label flex items-center gap-2 focus:outline-none cursor-pointer relative ${
                isSelected
                  ? 'border-secondary bg-secondary-container text-on-secondary-container hard-shadow font-bold'
                  : 'border-outline-variant/40 bg-surface hover:bg-surface-container-highest text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{p.icon}</span>
              {p.label}
            </motion.button>
          );
        })}
      </div>

      {/* Event sub-picker if Event is selected */}
      {selectedPreset === 'Event' && (
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-4 p-4 bg-surface-container-low rounded border border-outline-variant/20 flex flex-col sm:flex-row sm:items-center gap-3"
        >
          <span className="spec-label text-primary/60">Event Sub-Type:</span>
          <div className="flex flex-wrap gap-2">
            {SUB_PRESETS.map((sub) => (
              <motion.button
                key={sub}
                id={`demo-${sub.toLowerCase()}-btn`}
                suppressHydrationWarning
                whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
                onClick={() => onPresetChange('Event', sub)}
                className={`px-3 py-1 rounded spec-label transition-colors cursor-pointer ${
                  selectedSubPreset === sub
                    ? 'bg-primary text-on-primary font-bold'
                    : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {sub}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};
