'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CategoryFilter,
  ClosetGrid,
  CulturalFilter,
  HangerRail,
  IngestionModal,
  useWardrobeItems,
} from '@/features/ingestion';
import { StitchingDivider } from '@/components';
import { MotionText, MotionContainer } from '@/components/ui/motionText';

export default function ClosetPage() {
  const router = useRouter();
  const {
    items,
    allItems,
    selectedStyle,
    setSelectedStyle,
    selectedCategory,
    setSelectedCategory,
    updateItemLaundryStatus,
    addItem,
    removeItem,
    loadSampleWardrobe,
    loading,
  } = useWardrobeItems('western');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuickStarting, setIsQuickStarting] = useState(false);

  const handleQuickStart = async () => {
    setIsQuickStarting(true);
    try {
      await loadSampleWardrobe();
      router.push('/today?quickstart=true');
    } catch (err) {
      console.error('Failed to quick-start wardrobe:', err);
      setIsQuickStarting(false);
    }
  };

  return (
    <div className="space-y-8 relative">
      {/* Daily Picks — Horizontal Hanger Rail */}
      <section>
        <MotionContainer staggerChildren={0.1} className="flex justify-between items-center mb-1">
          <div>
            <MotionText as="span" className="spec-label text-primary/60 block mb-0.5">Curated Selection</MotionText>
            <MotionText as="h2" className="font-display text-headline-md text-primary">Daily Picks</MotionText>
          </div>
          <MotionText as="span" className="spec-label text-primary/40 font-mono">RAIL 01</MotionText>
        </MotionContainer>

        <HangerRail items={allItems.slice(0, 6)} />
      </section>

      <StitchingDivider />

      {/* Empty State with Explicit Quick-Start Seeding Action */}
      {allItems.length === 0 && !loading && (
        <div data-testid="closet-empty-state" className="p-8 text-center bg-surface-container-lowest torn-swatch border border-outline-variant/30 rounded-lg space-y-4 my-6">
          <span className="material-symbols-outlined text-5xl text-primary/40">checkroom</span>
          <div>
            <h3 className="font-display text-title-lg text-primary">Your Closet is Pristine</h3>
            <p className="text-body-sm text-on-surface-variant max-w-md mx-auto mt-1">
              Start by adding your first garment photo with the &ldquo;+&rdquo; button, or quick-start with our curated capsule wardrobe to generate your first outfit in seconds.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              data-testid="quick-start-wardrobe-btn"
              onClick={handleQuickStart}
              disabled={isQuickStarting}
              className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-on-secondary rounded-lg font-mono text-xs uppercase tracking-wider font-bold hover:bg-primary transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">bolt</span>
              {isQuickStarting ? 'Preparing Wardrobe...' : 'Quick-Start Wardrobe (1-Click to First Outfit)'}
            </button>
            <button
              onClick={() => loadSampleWardrobe()}
              className="inline-flex items-center gap-2 px-4 py-2 text-primary font-mono text-xs uppercase tracking-wider hover:underline"
            >
              <span className="material-symbols-outlined text-sm">inventory_2</span>
              Load Sample Closet Here
            </button>
          </div>
        </div>
      )}

      {/* Inventory Archive — Grid with Cultural & Category Filters */}
      <section>
        <MotionContainer staggerChildren={0.1} className="flex justify-between items-center mb-3">
          <MotionText as="h2" className="font-display text-headline-md text-primary">Local Cupboard Items</MotionText>
          <MotionText as="span" className="spec-label text-on-surface-variant font-mono">
            {items.length} ITEMS
          </MotionText>
        </MotionContainer>

        {/* Dual Axis Filtering: Cultural Style + Category Selection */}
        <CulturalFilter selectedStyle={selectedStyle} onStyleChange={setSelectedStyle} />
        <CategoryFilter selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory} />

        <ClosetGrid
          items={items}
          loading={loading}
          onStatusClick={(id) => {
            const item = items.find((i) => i.id === id);
            if (item) {
              const nextStatus =
                item.laundry_status === 'CLEAN'
                  ? 'DIRTY'
                  : item.laundry_status === 'DIRTY'
                  ? 'IN_WASH'
                  : item.laundry_status === 'IN_WASH'
                  ? 'DRY_CLEANING'
                  : 'CLEAN';
              updateItemLaundryStatus(id, nextStatus);
            }
          }}
          onDeleteClick={removeItem}
        />
      </section>

      {/* Floating "+" Ingestion FAB */}
      <button
        onClick={() => setIsModalOpen(true)}
        aria-label="Add new garment to cupboard"
        className="fixed bottom-20 md:bottom-12 right-6 w-14 h-14 rounded-full bg-secondary text-on-secondary shadow-xl hard-shadow flex items-center justify-center hover:bg-primary transition-all z-40 tap-target"
      >
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>

      {/* Ingestion Modal */}
      <IngestionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(newItem) => {
          addItem(newItem);
        }}
      />
    </div>
  );
}
