'use client';

import React from 'react';
import { Card } from '@/components';
import { CULTURAL_STYLES } from '@/types';

export const GapAnalysisHeatmap: React.FC = () => {
  const formalities = [1, 2, 3, 4, 5];

  // Matrix coverage mock (cultural_style x formality_level)
  const coverageMap: Record<string, number> = {
    'western-1': 1,
    'western-2': 4,
    'western-3': 6,
    'western-4': 3,
    'western-5': 1,
    'indian_traditional-3': 2,
    'indian_traditional-5': 1,
    'islamic_modest-3': 1,
    'islamic_modest-4': 1,
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-display text-headline-md text-primary">Wardrobe Gap Analysis</h3>
          <p className="text-xs text-on-surface-variant font-body">
            Heatmap of Cultural Style × Formality Index coverage.
          </p>
        </div>
        <span className="spec-label text-sindoor bg-error-container/50 px-2.5 py-1 rounded text-[10px]">
          1 Gap Flagged
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
                        className={`w-8 h-8 mx-auto rounded flex items-center justify-center font-bold text-xs ${
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

      <div className="mt-4 p-3 bg-error-container/30 border border-sindoor/30 rounded text-xs text-sindoor flex items-center gap-2">
        <span className="material-symbols-outlined text-sm">warning</span>
        <span>Gap Flagged: No Formality 4-5 Islamic-Modest outerwear in inventory.</span>
      </div>
    </Card>
  );
};
