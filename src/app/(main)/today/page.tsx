'use client';

import React, { useState } from 'react';
import { ModeSelector, ContextPresets, FreeformInput, useContextResolver } from '@/features/context';
import { TwinningMatchResults } from '@/features/twinning';
import { StitchingAccent } from '@/components';
import { MotionText, MotionContainer } from '@/components/ui/motionText';

export default function TodayPage() {
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

  const handleGenerate = (text?: string) => {
    if (text) {
      resolveFreeform(text);
    } else {
      resolvePreset(selectedPreset, selectedSubPreset);
    }
    setShowResults(true);
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
