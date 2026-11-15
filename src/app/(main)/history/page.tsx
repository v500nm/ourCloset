'use client';

import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { HistoryTimeline } from '@/features/outfit-history';
import { GapAnalysisHeatmap } from '@/features/analytics';
import { StitchingDivider } from '@/components';
import { outfitRepository } from '@/data/repositories/outfitRepository';

export default function HistoryPage() {
  const history = useLiveQuery(() => outfitRepository.getAll(), []) || [];

  return (
    <div className="space-y-10">
      <div>
        <span className="spec-label text-primary/60 uppercase tracking-wider block mb-1">
          Outfit Memory & No-Repeat Guard
        </span>
        <h1 className="font-display text-headline-md text-primary">History & Analytics</h1>
        <p className="text-body-sm text-on-surface-variant font-body mt-1">
          Track wear counts, cost-per-wear metrics, and lookback guardrails across your household outfits.
        </p>
      </div>

      <StitchingDivider />

      <section>
        <h2 className="spec-label text-primary uppercase tracking-wider mb-4 block">
          Recent Logged Outfits
        </h2>
        <HistoryTimeline history={history} />
      </section>

      <StitchingDivider />

      <section>
        <GapAnalysisHeatmap />
      </section>
    </div>
  );
}
