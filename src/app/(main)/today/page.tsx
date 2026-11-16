'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ModeSelector, ContextPresets, FreeformInput, useContextResolver } from '@/features/context';
import { TwinningMatchResults } from '@/features/twinning';
import { StitchingAccent } from '@/components';
import { MotionText, MotionContainer } from '@/components/ui/motionText';
import { useWardrobe } from '@/providers/WardrobeProvider';

function TodayContent() {
  const searchParams = useSearchParams();
  const { items, loadSampleWardrobe, isLoading: isWardrobeLoading } = useWardrobe();
  const [isQuickStarting, setIsQuickStarting] = useState(false);

  const {
    mode,
    setMode,
    selectedPreset,
    selectedSubPreset,
    resolvePreset,
    resolveFreeform,
    resolvedContext,
    loading,
  } = useContextResolver();

  const [showResults, setShowResults] = useState(false);

  const handleGenerate = useCallback((text?: string) => {
    if (text) {
      resolveFreeform(text);
    } else {
      resolvePreset(selectedPreset, selectedSubPreset);
    }
    setShowResults(true);
  }, [resolveFreeform, resolvePreset, selectedPreset, selectedSubPreset]);

  // Immediate transition to outfit generation when quickstart parameter is present
  useEffect(() => {
    if (searchParams?.get('quickstart') === 'true') {
      handleGenerate();
    }
  }, [searchParams, handleGenerate]);

  const handleQuickStartToday = async () => {
    setIsQuickStarting(true);
    try {
      await loadSampleWardrobe();
      handleGenerate();
    } catch (err) {
      console.error('Failed to quick-start wardrobe on today page:', err);
    } finally {
      setIsQuickStarting(false);
    }
  };

  return (
    <div className="space-y-10 max-w-container mx-auto">
      {/* Headline */}
      <MotionContainer staggerChildren={0.1} className="text-center md:text-left">
        <MotionText as="span" className="spec-label text-primary/60 uppercase tracking-widest mb-2 block">
          Mode Selector
        </MotionText>
        <MotionText as="h1" className="font-display text-display-lg-mobile md:text-display-lg text-primary">
          Who are we dressing?
        </MotionText>
        <MotionText as="div">
          <StitchingAccent centered className="mt-6 md:mx-0" />
        </MotionText>
      </MotionContainer>

      {/* Onboarding Empty State Banner for Empty Closet */}
      {!isWardrobeLoading && items.length === 0 && (
        <div data-testid="today-empty-closet-banner" className="p-6 bg-surface-container-lowest torn-swatch border border-secondary/40 rounded-xl space-y-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-3xl text-secondary">auto_awesome</span>
            <div>
              <h3 className="font-display text-title-md text-primary font-bold">Quick-Start Your Wardrobe</h3>
              <p className="text-body-sm text-on-surface-variant">
                Your closet is currently empty. Quick-start with our curated capsule wardrobe to generate your first outfit in seconds.
              </p>
            </div>
          </div>
          <button
            data-testid="today-quickstart-btn"
            onClick={handleQuickStartToday}
            disabled={isQuickStarting}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-secondary text-on-secondary rounded-lg font-mono text-xs uppercase tracking-wider font-bold hover:bg-primary transition-all shadow"
          >
            <span className="material-symbols-outlined text-base">bolt</span>
            {isQuickStarting ? 'Orchestrating Outfit...' : 'Quick-Start & Generate First Outfit (1-Click)'}
          </button>
        </div>
      )}

      {/* Mode Cards (Husband / Twinning Day / Wife) */}
      <ModeSelector currentMode={mode} onModeChange={setMode} />

      <div className="stitching-border-full" />

      {/* Context Presets (Office, Casual, House, Event, Trip) */}
      <ContextPresets
        selectedPreset={selectedPreset}
        selectedSubPreset={selectedSubPreset}
        onPresetChange={(preset, sub) => {
          resolvePreset(preset, sub);
        }}
      />

      {/* Zero-Key Freeform Natural Language Input */}
      <FreeformInput
        onGenerate={handleGenerate}
        resolvedContext={resolvedContext}
        loading={loading}
      />

      {/* Onboarding Guide when outfit hasn't been generated yet */}
      {!showResults && items.length > 0 && (
        <div data-testid="today-ready-guide" className="p-5 bg-surface-container-lowest/80 border border-outline-variant/30 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl text-primary/60">lightbulb</span>
            <div className="text-xs text-on-surface-variant">
              <span className="font-semibold text-primary block text-sm">Ready for Your First Outfit Pairing?</span>
              Select a context preset above or click below to orchestrate instant cultural pairings.
            </div>
          </div>
          <button
            data-testid="generate-first-outfit-btn"
            onClick={() => handleGenerate()}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded font-mono text-xs uppercase tracking-wider font-bold hover:bg-primary/90 transition-all shadow shrink-0"
          >
            <span className="material-symbols-outlined text-base">auto_awesome</span>
            Generate Outfit Now
          </button>
        </div>
      )}

      {/* Twinning Match Results Board */}
      {showResults && (
        <div className="pt-6">
          <TwinningMatchResults
            activeMode={mode}
            eventContext={
              resolvedContext
                ? `Matched: ${resolvedContext.label}`
                : `${selectedSubPreset || selectedPreset} Coordination`
            }
          />
        </div>
      )}
    </div>
  );
}

export default function TodayPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-primary/60 font-mono text-xs">Loading context...</div>}>
      <TodayContent />
    </Suspense>
  );
}
