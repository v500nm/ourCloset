'use client';

import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Card } from '@/components';
import { CULTURAL_STYLES } from '@/types';
import { wardrobeRepository } from '@/data/repositories/wardrobeRepository';

export const GapAnalysisHeatmap: React.FC = () => {
  const formalities = [1, 2, 3, 4, 5];
  const items = useLiveQuery(() => wardrobeRepository.getAll(), []) || [];

  // Live coverage map (cultural_style x formality_level)
  const coverageMap: Record<string, number> = {};
  for (const item of items) {
    if (item.deleted_at) continue;
    const key = `${item.cultural_style}-${item.formality_level}`;
    coverageMap[key] = (coverageMap[key] || 0) + 1;
  }

  // Find all gaps where high formality (F4/F5) has 0 items
  const flaggedGaps: string[] = [];
  for (const style of CULTURAL_STYLES) {
    for (const f of [4, 5]) {
      const count = coverageMap[`${style.id}-${f}`] || 0;
      if (count === 0) {
        flaggedGaps.push(`${style.label} (Formality ${f})`);
      }
    }
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-display text-headline-md text-primary">Wardrobe Gap Analysis</h3>
          <p className="text-xs text-on-surface-variant font-body">
            Live matrix of Cultural Style × Formality Index from your cupboard inventory ({items.length} total items).
          </p>
        </div>
        <span
          className={`spec-label px-2.5 py-1 rounded text-[10px] font-mono ${
            flaggedGaps.length > 0
              ? 'text-sindoor bg-error-container/50'
              : 'text-emerald-800 bg-emerald-100'
          }`}
        >
          {flaggedGaps.length > 0 ? `${flaggedGaps.length} Gaps Flagged` : 'Balanced Coverage'}
        </span>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-center border-collapse font-mono text-xs">
          <thead>
            <tr className="border-b border-dashed border-outline-variant/40">
              <th className="py-2 px-3 text-left spec-label text-primary/60">Style \ Formality</th>
              {formalities.map((f) => (
                <th key={f} className="py-2 px-3 spec-label text-primary/60">
                  F{f}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CULTURAL_STYLES.map((style) => (
              <tr key={style.id} className="border-b border-outline-variant/20">
                <td className="py-3 px-3 text-left font-bold text-primary font-body text-xs">
                  {style.label}
                </td>
                {formalities.map((f) => {
                  const count = coverageMap[`${style.id}-${f}`] || 0;
                  const isGap = count === 0 && (f === 4 || f === 5);
                  return (
                    <td key={f} className="py-3 px-3">
                      <div
                        className={`w-8 h-8 mx-auto rounded flex items-center justify-center font-bold text-xs transition-colors ${
                          count > 3
                            ? 'bg-primary text-on-primary'
                            : count > 0
                            ? 'bg-secondary-container text-on-secondary-container'
                            : isGap
                            ? 'bg-sindoor/20 text-sindoor border border-sindoor'
                            : 'bg-surface-container text-primary/30'
                        }`}
                        title={`${style.label} Formality ${f}: ${count} items`}
                      >
                        {count}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {flaggedGaps.length > 0 && (
        <div className="mt-4 p-3 bg-error-container/30 border border-sindoor/30 rounded text-xs text-sindoor flex items-start gap-2">
          <span className="material-symbols-outlined text-sm mt-0.5">warning</span>
          <div>
            <span className="font-bold">Missing Event Coverage: </span>
            <span>No formal options available in: {flaggedGaps.join(', ')}.</span>
          </div>
        </div>
      )}
    </Card>
  );
};
