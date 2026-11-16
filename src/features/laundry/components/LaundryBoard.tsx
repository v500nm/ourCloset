'use client';

import React from 'react';
import { useLaundry } from '../hooks/useLaundry';
import { Badge, Card, StatusWheel } from '@/components';
import { MotionText, MotionContainer } from '@/components/ui/motionText';
import { GarmentThumb } from '@/components/ui/garmentThumb';
import { trackPrivacyEvent } from '@/services/telemetry';

const LAUNDRY_STATUS_SEQUENCE = ['CLEAN', 'DIRTY', 'IN_WASH', 'DRY_CLEANING'] as const;

function getNextStatus(current: string) {
  const idx = LAUNDRY_STATUS_SEQUENCE.indexOf(current as any);
  if (idx === -1) return 'DIRTY';
  return LAUNDRY_STATUS_SEQUENCE[(idx + 1) % LAUNDRY_STATUS_SEQUENCE.length];
}

export const LaundryBoard: React.FC = () => {
  const { items, activeTab, setActiveTab, summary, setStatus } = useLaundry();

  const handleCardKeyDown = (e: React.KeyboardEvent, itemId: string, currentStatus: string) => {
    // Only handle if directly pressed on the card container
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const next = getNextStatus(currentStatus);
      setStatus(itemId, next as any);
      trackPrivacyEvent('laundry_status_changed', {
        from_status: currentStatus,
        to_status: next,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <MotionContainer staggerChildren={0.1}>
        <MotionText as="h2" className="font-display text-headline-md text-primary">
          Laundry Board
        </MotionText>
        <MotionText as="div" className="spec-label text-sindoor mt-1 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sindoor inline-block animate-pulse" aria-hidden="true" />
          {summary.attentionRequiredCount} ITEMS REQUIRE ATTENTION
        </MotionText>
      </MotionContainer>

      <div className="stitching-border-full" />

      {/* Filter Tabs */}
      <div
        role="tablist"
        aria-label="Laundry status filters"
        className="flex gap-6 border-b border-outline-variant/30 pb-2"
      >
        <button
          role="tab"
          aria-selected={activeTab === 'ALL'}
          tabIndex={0}
          onClick={() => setActiveTab('ALL')}
          className={`spec-label transition-colors pb-1 focus-visible:ring-2 focus-visible:ring-secondary focus-visible:outline-none ${
            activeTab === 'ALL'
              ? 'text-primary border-b-2 border-secondary font-bold'
              : 'text-on-surface-variant hover:text-primary'
          }`}
        >
          All Items ({summary.totalItems})
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'DIRTY_ONLY'}
          tabIndex={0}
          onClick={() => setActiveTab('DIRTY_ONLY')}
          className={`spec-label transition-colors pb-1 focus-visible:ring-2 focus-visible:ring-secondary focus-visible:outline-none ${
            activeTab === 'DIRTY_ONLY'
              ? 'text-primary border-b-2 border-secondary font-bold'
              : 'text-on-surface-variant hover:text-primary'
          }`}
        >
          Dirty Only ({summary.dirtyCount + summary.washCount})
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'DRY_CLEANERS'}
          tabIndex={0}
          onClick={() => setActiveTab('DRY_CLEANERS')}
          className={`spec-label transition-colors pb-1 focus-visible:ring-2 focus-visible:ring-secondary focus-visible:outline-none ${
            activeTab === 'DRY_CLEANERS'
              ? 'text-primary border-b-2 border-secondary font-bold'
              : 'text-on-surface-variant hover:text-primary'
          }`}
        >
          At Dry Cleaners ({summary.dryCleaningCount})
        </button>
      </div>

      {/* Items Grid */}
      {items.length === 0 ? (
        <div className="p-12 text-center bg-surface-container-lowest torn-swatch border border-outline-variant/30 hard-shadow">
          <span className="material-symbols-outlined text-4xl text-emerald-700 mb-2" aria-hidden="true">
            check_circle
          </span>
          <h3 className="font-display text-body-md text-primary font-bold">All Clean!</h3>
          <p className="spec-label text-on-surface-variant mt-1">No items match the selected laundry filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" role="list" aria-label="Laundry items">
          {items.map((item) => (
            <Card
              key={item.id}
              tabIndex={0}
              role="listitem"
              aria-label={`${item.title}, currently ${item.laundry_status}. Press Space or Enter to advance status.`}
              onKeyDown={(e) => handleCardKeyDown(e, item.id, item.laundry_status)}
              className="p-0 overflow-hidden flex flex-col justify-between focus-visible:ring-2 focus-visible:ring-secondary focus-visible:outline-none focus:outline-none transition-shadow"
            >
              {/* Garment Image & Status Badge (Combines icon glyph, text label, and color token) */}
              <div className="relative aspect-[4/3] w-full bg-surface-container overflow-hidden">
                <GarmentThumb item={item} className="w-full h-full object-cover" />

                <div className="absolute top-3 right-3">
                  {item.laundry_status === 'DIRTY' && <Badge variant="dirty">DIRTY</Badge>}
                  {item.laundry_status === 'IN_WASH' && <Badge variant="wash">IN WASH</Badge>}
                  {item.laundry_status === 'DRY_CLEANING' && <Badge variant="dryclean">AT CLEANERS</Badge>}
                  {item.laundry_status === 'CLEAN' && <Badge variant="clean">CLEAN</Badge>}
                </div>
              </div>

              {/* Garment Details & Status Wheel */}
              <div className="p-5 bg-surface-container-lowest space-y-4">
                <div>
                  <h3 className="font-display text-body-md text-primary font-bold">{item.title}</h3>
                  <p className="spec-label text-on-surface-variant text-xs mt-0.5">
                    {item.fabric_type || 'Cotton'} / {item.cultural_style}
                  </p>
                </div>

                <div className="pt-3 border-t border-dashed border-outline-variant/30">
                  <div className="flex justify-between items-center mb-2">
                    <span className="spec-label text-primary/60 text-[10px] uppercase font-mono">
                      Update Status
                    </span>
                    <span className="text-[9px] text-on-surface-variant font-mono">
                      Enter / Space to advance
                    </span>
                  </div>
                  <StatusWheel
                    currentStatus={item.laundry_status}
                    ariaLabel={`Change laundry status for ${item.title}`}
                    onStatusChange={(status) => {
                      setStatus(item.id, status as any);
                      trackPrivacyEvent('laundry_status_changed', {
                        from_status: item.laundry_status,
                        to_status: status,
                      });
                    }}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
