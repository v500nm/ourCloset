'use client';

import React, { useState } from 'react';
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
    loading,
  } = useWardrobeItems('western');

  const [isModalOpen, setIsModalOpen] = useState(false);

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
