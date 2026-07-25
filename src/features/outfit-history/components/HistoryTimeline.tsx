'use client';

import React from 'react';
import { OutfitHistory } from '@/types';
import { Card } from '@/components';
import { formatDate } from '@/utils';

export const HistoryTimeline: React.FC<{ history: OutfitHistory[] }> = ({ history }) => {
  if (history.length === 0) {
    return (
      <div className="p-8 text-center bg-surface-container-lowest torn-swatch border border-outline-variant/30">
        <span className="material-symbols-outlined text-4xl text-primary/40 mb-2">history</span>
        <p className="spec-label text-on-surface-variant">No outfit history logged yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((entry) => (
        <Card key={entry.id} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="spec-label text-secondary font-bold font-mono text-xs">
                {entry.event_context || 'Casual Day'}
              </span>
              <span className="spec-label text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[10px]">
                No-Repeat Guard Active (30 Days)
              </span>
            </div>
            <p className="text-body-sm text-primary font-body font-medium">
              Items: {entry.item_ids.join(', ')}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-on-surface-variant">
            <div className="flex items-center text-amber-600">
              {Array.from({ length: entry.rating || 5 }).map((_, i) => (
                <span key={i} className="material-symbols-outlined text-sm">star</span>
              ))}
            </div>
            <span>Worn on {formatDate(entry.worn_at)}</span>
          </div>
        </Card>
      ))}
    </div>
  );
};
