'use client';

import React, { useState } from 'react';
import { useTwinning } from '../hooks/useTwinning';
import { Button, Card, TwinSwatch } from '@/components';
import { CardSkeleton } from '@/components/ui/skeleton';
import { ActiveMode } from '@/types';
import { useHousehold } from '@/providers/HouseholdProvider';
import { useWardrobe } from '@/providers/WardrobeProvider';
import { GarmentThumb } from '@/components/ui/garmentThumb';
import { logBetaFeedback } from '@/services/localLearningEngine';
import { trackPrivacyEvent } from '@/services/telemetry';

interface TwinningMatchResultsProps {
  eventContext?: string;
  activeMode: ActiveMode;
}

export const TwinningMatchResults: React.FC<TwinningMatchResultsProps> = ({
  eventContext = 'Sarah & Tariq\'s Sangeet Night',
  activeMode,
}) => {
  const { members } = useHousehold();
  const { markItemsDirty, loadSampleWardrobe } = useWardrobe();
  const initiatorMemberId = activeMode.memberIds[0];
  const partnerMemberId = activeMode.memberIds.length > 1 ? activeMode.memberIds[1] : undefined;

  const {
    tiers,
    selectedTier,
    setSelectedTier,
    status,
    rerolls,
    loading,
    handleAccept,
    handleReroll,
  } = useTwinning(eventContext, { initiatorMemberId, partnerMemberId });

  const [woreOutfit, setWoreOutfit] = useState<boolean | null>(null);
  const [culturalTag, setCulturalTag] = useState<string>('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);

  const handleQuickStartInTwinning = async () => {
    setIsSeeding(true);
    try {
      await loadSampleWardrobe();
      window.location.reload();
    } catch (err) {
      console.error('Failed to seed wardrobe:', err);
      setIsSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-in fade-in duration-500">
        <div className="spec-label text-primary mb-2">Orchestrating Twinning Match Tiers...</div>
        <CardSkeleton />
      </div>
    );
  }

  if (tiers.length === 0) {
    return (
      <div
        data-testid="twinning-empty-state"
        className="p-8 text-center bg-surface-container-lowest torn-swatch border border-outline-variant/30 rounded-lg space-y-4"
      >
        <span className="material-symbols-outlined text-4xl text-primary/40 mb-2">style</span>
        <h3 className="font-display text-body-md text-primary font-bold">No Match Tiers Available</h3>
        <p className="text-xs text-on-surface-variant font-body max-w-sm mx-auto">
          Please add garments to your wardrobe or quick-start with our curated capsule wardrobe to orchestrate twinning matches instantly.
        </p>
        <button
          data-testid="twinning-quickstart-btn"
          onClick={handleQuickStartInTwinning}
          disabled={isSeeding}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-secondary text-on-secondary rounded font-mono text-xs uppercase tracking-wider font-bold hover:bg-primary transition-all shadow"
        >
          <span className="material-symbols-outlined text-sm">bolt</span>
          {isSeeding ? 'Seeding Wardrobe...' : 'Quick-Start Wardrobe'}
        </button>
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

  const handleSubmitFeedback = async () => {
    if (!activeTier) return;
    const itemIds = activeTier.partnerOutfit.map((item) => item.id);
    itemIds.push('SU-NVY-01');

    const accuracy = culturalTag === 'authentic' ? 'authentic' : (culturalTag ? 'clash' : 'acceptable');

    await logBetaFeedback({
      woreOutfit: woreOutfit ?? true,
      culturalAccuracy: accuracy,
      feedbackCategory: culturalTag || 'general',
      eventContext,
      selectedTier,
      lockedItemIds: itemIds,
    });

    trackPrivacyEvent('beta_feedback', {
      wore_outfit: woreOutfit ?? true,
      cultural_accuracy: accuracy,
      feedback_category: culturalTag || 'general',
      selected_tier: selectedTier,
      item_count: itemIds.length,
    });

    setFeedbackSubmitted(true);
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
                      <GarmentThumb item={item} className="w-full h-full object-cover" />
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

          {/* Atelier-Styled Beta Feedback Mechanism */}
          <div data-testid="beta-feedback-section" className="mt-8 pt-6 border-t border-dashed border-outline-variant/40">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-lg">rate_review</span>
                <span className="spec-label text-primary font-bold">Beta Household Feedback</span>
              </div>
              <span className="text-[11px] font-mono text-on-surface-variant/80 uppercase">Zero PII • Local Learning</span>
            </div>

            {feedbackSubmitted ? (
              <div data-testid="beta-feedback-submitted" className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-lg flex items-center gap-3 text-emerald-800 dark:text-emerald-200">
                <span className="material-symbols-outlined text-xl">check_circle</span>
                <div className="text-xs">
                  <span className="font-bold">Thank you for your feedback!</span> Saved to your device&apos;s local learning engine to refine future cultural outfit pairings.
                </div>
              </div>
            ) : (
              <div className="space-y-4 bg-surface-container-lowest/60 p-4 rounded-xl border border-outline-variant/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xs font-medium text-primary">Did you wear this suggested outfit?</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid="wear-yes-btn"
                      onClick={() => setWoreOutfit(true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
                        woreOutfit === true
                          ? 'bg-primary text-on-primary shadow-sm'
                          : 'bg-surface-container border border-outline-variant/40 text-primary hover:bg-surface-container-high'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">check</span>
                      Yes, wore it
                    </button>
                    <button
                      type="button"
                      data-testid="wear-no-btn"
                      onClick={() => setWoreOutfit(false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
                        woreOutfit === false
                          ? 'bg-rose-700 text-white shadow-sm'
                          : 'bg-surface-container border border-outline-variant/40 text-primary hover:bg-surface-container-high'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                      No, skipped
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-medium text-primary block">Cultural Feedback & Fluency:</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'authentic', label: 'Culturally Authentic', icon: 'verified' },
                      { key: 'formality_mismatch', label: 'Formality Mismatch', icon: 'balance' },
                      { key: 'modesty_unmet', label: 'Modesty Unmet', icon: 'shield' },
                      { key: 'color_clash', label: 'Color / Accent Clash', icon: 'palette' },
                    ].map((pill) => (
                      <button
                        key={pill.key}
                        type="button"
                        data-testid={`cultural-feedback-${pill.key}`}
                        onClick={() => setCulturalTag(pill.key)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all flex items-center gap-1 ${
                          culturalTag === pill.key
                            ? 'bg-secondary text-on-secondary font-bold'
                            : 'bg-surface border border-outline-variant/30 text-on-surface-variant hover:border-secondary/50'
                        }`}
                      >
                        <span className="material-symbols-outlined text-xs">{pill.icon}</span>
                        {pill.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    data-testid="submit-beta-feedback-btn"
                    disabled={woreOutfit === null && !culturalTag}
                    onClick={handleSubmitFeedback}
                    className="px-4 py-1.5 bg-primary text-on-primary rounded font-mono text-xs uppercase tracking-wider font-semibold hover:bg-primary/90 transition-all disabled:opacity-40"
                  >
                    Submit Beta Feedback
                  </button>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
