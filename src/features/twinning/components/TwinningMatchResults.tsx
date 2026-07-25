'use client';

import React from 'react';
import { useTwinning } from '../hooks/useTwinning';
import { Button, Card, TwinSwatch } from '@/components';
import { CardSkeleton } from '@/components/ui/skeleton';
import { ActiveMode } from '@/types';
import { useHousehold } from '@/providers/HouseholdProvider';
import { useWardrobe } from '@/providers/WardrobeProvider';

interface TwinningMatchResultsProps {
  eventContext?: string;
  activeMode: ActiveMode;
}

export const TwinningMatchResults: React.FC<TwinningMatchResultsProps> = ({
  eventContext = 'Sarah & Tariq\'s Sangeet Night',
  activeMode,
}) => {
  const { members } = useHousehold();
  const { markItemsDirty } = useWardrobe();
  const {
    tiers,
    selectedTier,
    setSelectedTier,
    status,
    rerolls,
    loading,
    handleAccept,
    handleReroll,
  } = useTwinning(eventContext);

  if (loading) {
    return (
      <div className="space-y-4 animate-in fade-in duration-500">
        <div className="spec-label text-primary mb-2">Orchestrating Twinning Match Tiers...</div>
        <CardSkeleton />
      </div>
    );
  }

  const activeTier = tiers.find((t) => t.tier === selectedTier) || tiers[1];

  // Resolve member names dynamically based on the active mode
  const activeMembers = activeMode.memberIds.map(id => members.find(m => m.id === id)).filter(Boolean);
  const primaryName = activeMembers[0]?.name || 'Partner A';
  const secondaryName = activeMembers.length > 1 ? activeMembers[1]?.name : 'Suggested Match';
  const isSolo = activeMode.type === 'solo';

  const onLockOutfit = () => {
    handleAccept();
    if (activeTier) {
      const itemIds = activeTier.partnerOutfit.map((item) => item.id);
      itemIds.push('SU-NVY-01'); // Add the initiator's item
      markItemsDirty(itemIds);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end pb-4 border-b border-dashed border-outline-variant">
        <div>
          <span className="spec-label text-secondary block mb-1">OOTD RSVP • 3 Match Tiers</span>
          <h2 className="font-display text-headline-md text-primary">{eventContext}</h2>
        </div>
        {status === 'ACCEPTED' ? (
          <span className="spec-label text-emerald-800 bg-emerald-100 px-3 py-1 rounded">
            Outfit Locked & Sync’d
          </span>
        ) : (
          <span className="spec-label text-on-surface-variant font-mono text-xs">
            Re-rolls left today: {rerolls}/2
          </span>
        )}
      </div>

      {/* Tier selector tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers.map((t) => {
          const isSelected = selectedTier === t.tier;
          return (
            <button
              key={t.tier}
              onClick={() => setSelectedTier(t.tier)}
              className={`p-5 text-left border torn-swatch hard-shadow transition-all ${
                isSelected
                  ? 'border-secondary bg-surface-container-lowest ring-1 ring-secondary'
                  : 'border-outline-variant/30 bg-surface hover:bg-surface-container-highest'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="spec-label text-primary font-bold">{t.label}</span>
                <TwinSwatch colorA="#1F3B33" colorB="#B8935A" />
              </div>
              <p className="text-body-sm text-on-surface-variant line-clamp-2">{t.description}</p>
            </button>
          );
        })}
      </div>

      {/* Side-by-Side Flat-Lay Board */}
      {activeTier && (
        <Card className="p-6">
          <div className="spec-label text-primary/60 mb-4 uppercase tracking-wider">
            Match Tier: {activeTier.label} — {activeTier.matchReason}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
            {/* Partner A Column */}
            <div>
              <div className="spec-label text-primary mb-3">
                {primaryName} {isSolo ? '(Solo Mode)' : '(Initiator)'}
              </div>
              <div className="p-4 bg-surface-container rounded border border-outline-variant/30 flex items-center gap-4">
                <div className="w-20 h-24 bg-surface-container-high rounded overflow-hidden flex-shrink-0">
                  <img
                    src="https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=300&auto=format&fit=crop&q=80"
                    alt="Navy Wool Suit"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="spec-label text-primary/60 text-[10px]">SU-NVY-01</div>
                  <h4 className="font-display text-body-md text-primary font-semibold">Navy Wool Suit</h4>
                  <p className="text-xs text-on-surface-variant font-mono mt-1">Formality 5 • Western</p>
                </div>
              </div>
            </div>

            {/* Vertical Stitching Divider for desktop */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-[1px] border-r border-dashed border-outline-variant/40" />

            {/* Partner B Column */}
            <div>
              <div className="spec-label text-secondary mb-3">
                {isSolo ? 'Alternative Option' : `${secondaryName} (Suggested Match)`}
              </div>
              <div className="space-y-3">
                {activeTier.partnerOutfit.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-surface-container rounded border border-secondary/30 flex items-center gap-4"
                  >
                    <div className="w-20 h-24 bg-surface-container-high rounded overflow-hidden flex-shrink-0">
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="spec-label text-primary/60 text-[10px]">{item.id}</div>
                      <h4 className="font-display text-body-md text-primary font-semibold">{item.title}</h4>
                      <p className="text-xs text-on-surface-variant font-mono mt-1">
                        Formality {item.formality_level} • {item.cultural_style}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 pt-4 border-t border-dashed border-outline-variant/30 flex flex-wrap gap-4 justify-end items-center">
            {rerolls > 0 && status === 'PENDING' && (
              <Button variant="outline" onClick={handleReroll}>
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                Re-Roll Tier ({rerolls} left)
              </Button>
            )}
            {status === 'PENDING' ? (
              <Button onClick={onLockOutfit}>
                <span className="material-symbols-outlined text-[18px]">lock</span>
                Lock Outfit & Notify Partner (OOTD RSVP)
              </Button>
            ) : (
              <div className="spec-label text-emerald-700 flex items-center gap-1 font-bold">
                <span className="material-symbols-outlined text-lg">check_circle</span>
                Outfit Locked & Synced via Supabase Realtime
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
