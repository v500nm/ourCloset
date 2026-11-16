'use client';

import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ActiveMode } from '../types/context.types';
import { useHousehold, FamilyMember } from '@/providers/HouseholdProvider';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components';

interface ModeSelectorProps {
  currentMode: ActiveMode;
  onModeChange: (mode: ActiveMode) => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ currentMode, onModeChange }) => {
  const shouldReduceMotion = useReducedMotion();
  const { members, primaryCoupleIds, twinningPair } = useHousehold();
  const { user } = useAuth();
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customSelection, setCustomSelection] = useState<string[]>([]);
  const [upgradePrompt, setUpgradePrompt] = useState<string | null>(null);

  const hoverMotion = shouldReduceMotion
    ? {}
    : {
        y: -4,
        transition: { type: 'spring' as const, stiffness: 300, damping: 20 },
      };

  const tapMotion = shouldReduceMotion ? {} : { scale: 0.98 };

  // Find default couple based on primaryCoupleIds or fallback
  let husband, wife;
  if (primaryCoupleIds) {
    husband = members.find((m) => m.id === primaryCoupleIds[0]);
    wife = members.find((m) => m.id === primaryCoupleIds[1]);
  } else {
    husband = members.find((m) => m.role === 'husband' || m.hierarchyRole === 'head_of_household');
    wife = members.find((m) => m.role === 'wife' || m.hierarchyRole === 'spouse');
  }
  const hasCouple = husband && wife;

  // Find explicit twinning pair if configured
  let twin1, twin2;
  if (twinningPair) {
    twin1 = members.find((m) => m.id === twinningPair[0]);
    twin2 = members.find((m) => m.id === twinningPair[1]);
  }
  const hasDistinctTwinning =
    twin1 &&
    twin2 &&
    (!hasCouple ||
      twinningPair?.[0] !== primaryCoupleIds?.[0] ||
      twinningPair?.[1] !== primaryCoupleIds?.[1]);

  const toggleCustomMember = (id: string) => {
    setCustomSelection((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  };

  const applyCustomMatch = () => {
    if (customSelection.length > 0) {
      if (user?.subscriptionTier === 'family' || user?.subscriptionTier === 'max') {
        onModeChange({ type: 'custom', memberIds: customSelection });
      } else {
        setUpgradePrompt('Custom matching requires the Family or Max subscription tier.');
      }
    }
  };

  const handleCoupleSelect = () => {
    if (user?.subscriptionTier === 'couple' || user?.subscriptionTier === 'family' || user?.subscriptionTier === 'max') {
      if (husband && wife) {
        onModeChange({ type: 'couple', memberIds: [husband.id, wife.id] });
      }
    } else {
      setUpgradePrompt('Couple matching requires the Couple subscription tier or higher.');
    }
  };

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="spec-label text-primary/70 uppercase tracking-wider">Select Mode</h2>
        <button 
          onClick={() => {
            setIsCustomMode(!isCustomMode);
            setUpgradePrompt(null);
          }}
          className={`text-xs spec-label px-2 py-1 rounded transition-colors ${isCustomMode ? 'bg-primary text-on-primary' : 'bg-surface-variant text-on-surface-variant'}`}
        >
          {isCustomMode ? 'Close Custom' : 'Custom Match'}
        </button>
      </div>

      {upgradePrompt && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-4 bg-secondary/10 border border-secondary/30 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-secondary">workspace_premium</span>
            <p className="text-sm text-primary font-bold">{upgradePrompt}</p>
          </div>
          <Button variant="primary" className="py-1.5 px-3 text-xs">Upgrade Plan</Button>
        </motion.div>
      )}

      {isCustomMode ? (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-surface-container-low p-4 border border-outline-variant/30 rounded"
        >
          <p className="text-xs text-primary/60 mb-3 spec-label uppercase">Select members to match</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {members.map((m) => {
              const isSelected = customSelection.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleCustomMember(m.id)}
                  className={`px-3 py-1.5 rounded text-sm transition-colors border ${
                    isSelected ? 'bg-secondary text-on-secondary border-secondary' : 'bg-surface border-outline-variant/50 text-on-surface-variant hover:border-primary/30'
                  }`}
                >
                  {m.name}
                </button>
              );
            })}
          </div>
          <button 
            onClick={applyCustomMatch}
            disabled={customSelection.length === 0}
            className="px-4 py-2 bg-primary text-on-primary rounded text-sm font-bold disabled:opacity-50 transition-opacity"
          >
            Apply Match
          </button>
        </motion.div>
      ) : (
        <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar">
          {/* Default Couple Mode (if exists) */}
          {hasCouple && husband && wife && (
            <motion.button
              id="demo-couple-btn"
              suppressHydrationWarning
              whileHover={hoverMotion}
              whileTap={tapMotion}
              onClick={handleCoupleSelect}
              className={`flex-shrink-0 group relative bg-surface-container-lowest border torn-swatch hard-shadow p-4 min-w-[180px] flex flex-col items-center text-center transition-all focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 ${
                currentMode.type === 'couple' ? 'border-secondary ring-1 ring-secondary' : 'border-outline-variant/30'
              }`}
            >
              <div className="relative w-20 h-12 mb-3 flex justify-center items-center">
                <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center absolute left-0 z-10 border-2 border-surface-container-lowest font-display text-primary font-bold">
                  {husband.name?.charAt(0)}
                </div>
                <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center absolute right-0 z-0 border-2 border-surface-container-lowest font-display text-on-secondary-container font-bold">
                  {wife.name?.charAt(0)}
                </div>
              </div>
              <h3 className="font-display text-title-md text-primary mb-1">Couple</h3>
              <span className="spec-label text-[10px] text-on-secondary-container bg-secondary-container px-2 py-0.5 rounded brass-text line-clamp-1">
                {husband.name} & {wife.name}
              </span>
              <div className={`absolute top-2 right-2 w-3 h-3 rounded-full flex items-center justify-center ${currentMode.type === 'couple' ? 'bg-secondary' : 'border border-outline-variant'}`}>
                {currentMode.type === 'couple' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </motion.button>
          )}

          {/* Configured Twinning Pair (when distinct from Primary Couple) */}
          {hasDistinctTwinning && twin1 && twin2 && (
            <motion.button
              whileHover={hoverMotion}
              whileTap={tapMotion}
              onClick={() => {
                setUpgradePrompt(null);
                onModeChange({ type: 'couple', memberIds: [twin1.id, twin2.id] });
              }}
              className={`flex-shrink-0 group relative bg-surface-container-lowest border torn-swatch hard-shadow p-4 min-w-[180px] flex flex-col items-center text-center transition-all focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 ${
                currentMode.type === 'couple' && currentMode.memberIds.includes(twin1.id) && currentMode.memberIds.includes(twin2.id)
                  ? 'border-secondary ring-1 ring-secondary'
                  : 'border-outline-variant/30'
              }`}
            >
              <div className="relative w-20 h-12 mb-3 flex justify-center items-center">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center absolute left-0 z-10 border-2 border-surface-container-lowest font-display text-amber-900 font-bold">
                  {twin1.name?.charAt(0)}
                </div>
                <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center absolute right-0 z-0 border-2 border-surface-container-lowest font-display text-on-secondary-container font-bold">
                  {twin2.name?.charAt(0)}
                </div>
              </div>
              <h3 className="font-display text-title-md text-primary mb-1">Twinning Pair</h3>
              <span className="spec-label text-[10px] text-amber-900 bg-amber-100 px-2 py-0.5 rounded brass-text line-clamp-1">
                {twin1.name} & {twin2.name}
              </span>
              <div
                className={`absolute top-2 right-2 w-3 h-3 rounded-full flex items-center justify-center ${
                  currentMode.type === 'couple' && currentMode.memberIds.includes(twin1.id) && currentMode.memberIds.includes(twin2.id)
                    ? 'bg-secondary'
                    : 'border border-outline-variant'
                }`}
              >
                {currentMode.type === 'couple' && currentMode.memberIds.includes(twin1.id) && currentMode.memberIds.includes(twin2.id) && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>
            </motion.button>
          )}

          {/* Individual Solo Modes */}
          {members.map((m) => {
            const isSelected = currentMode.type === 'solo' && currentMode.memberIds.includes(m.id);
            return (
              <motion.button
                key={m.id}
                suppressHydrationWarning
                whileHover={hoverMotion}
                whileTap={tapMotion}
                onClick={() => {
                  setUpgradePrompt(null);
                  onModeChange({ type: 'solo', memberIds: [m.id] });
                }}
                className={`flex-shrink-0 group relative bg-surface-container-lowest border torn-swatch hard-shadow p-4 min-w-[140px] flex flex-col items-center text-center transition-all focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 ${
                  isSelected ? 'border-secondary ring-1 ring-secondary' : 'border-outline-variant/30'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mb-3 group-hover:bg-secondary/10 transition-colors">
                  <span className="font-display text-xl text-primary font-bold">{m.name.charAt(0)}</span>
                </div>
                <h3 className="font-display text-title-md text-primary mb-1">{m.name}</h3>
                <span className="spec-label text-[10px] text-on-surface-variant bg-surface-variant px-2 py-0.5 rounded">
                  {m.customRoleLabel || m.role}
                </span>
                <div className={`absolute top-2 right-2 w-3 h-3 rounded-full border ${isSelected ? 'bg-secondary border-secondary' : 'border-outline-variant'}`} />
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
};
