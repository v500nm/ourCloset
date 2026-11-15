'use client';

import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { OutfitHistory } from '@/types';
import { Card } from '@/components';
import { formatDate } from '@/utils';
import { wardrobeRepository } from '@/data/repositories/wardrobeRepository';

export const HistoryTimeline: React.FC<{ history: OutfitHistory[] }> = ({ history }) => {
  const allItems = useLiveQuery(() => wardrobeRepository.getAll(), []) || [];
  const itemMap = new Map(allItems.map((i) => [i.id, i]));

  if (history.length === 0) {
    return (
      <div className="p-8 text-center bg-surface-container-lowest torn-swatch border border-outline-variant/30">
        <span className="material-symbols-outlined text-4xl text-primary/40 mb-2">history</span>
        <p className="spec-label text-on-surface-variant">No outfit history logged yet.</p>
        <p className="text-xs text-on-surface-variant font-body mt-1">
          Lock in your outfits on the Daily Twinning board or RSVP to an event to start tracking rotations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((entry) => {
        const garmentTitles = entry.item_ids.map((id) => {
          const item = itemMap.get(id);
          return item ? item.title : id;
        });

        return (
          <Card
            key={entry.id}
            className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-outline-variant transition-colors"
          >
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="spec-label text-secondary font-bold font-mono text-xs">
                  {entry.event_context || 'Casual Day'}
                </span>
                <span className="spec-label text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[10px] font-mono">
                  30-Day Guard Active
                </span>
                {entry.worn_by && (
                  <span className="spec-label text-primary/60 bg-surface-container px-2 py-0.5 rounded text-[10px] font-mono">
                    Worn by: {entry.worn_by}
                  </span>
                )}
              </div>
              <p className="text-body-sm text-primary font-body font-medium">
                {garmentTitles.join(' • ')}
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-on-surface-variant flex-shrink-0">
              <div className="flex items-center text-amber-600" title={`Rating: ${entry.rating || 5} Stars`}>
                {Array.from({ length: entry.rating || 5 }).map((_, i) => (
                  <span key={i} className="material-symbols-outlined text-sm">
                    star
                  </span>
                ))}
              </div>
              <span>Worn {formatDate(entry.worn_at)}</span>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
