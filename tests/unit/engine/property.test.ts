import { describe, it, expect } from 'vitest';
import { generateTwinningTiersEngine } from '@/engine';
import { WardrobeItem, FormalityLevel, CulturalStyle } from '@/types';

function createPropertyItem(
  id: string,
  formality: FormalityLevel,
  laundryStatus: WardrobeItem['laundry_status'],
  style: CulturalStyle = 'western'
): WardrobeItem {
  return {
    id,
    user_id: 'u-prop',
    title: `Item ${id}`,
    category: 'shirt',
    cultural_style: style,
    primary_color_hex: '#FFFFFF',
    formality_level: formality,
    image_url: 'img.jpg',
    laundry_status: laundryStatus,
    privacy_tier: 'PUBLIC',
    season_tags: ['all-season'],
    wear_count: 0,
    created_at: '2026-01-01T00:00:00Z',
  };
}

describe('Engine Property-Based Invariant Verification', () => {
  const now = new Date('2026-03-01T12:00:00Z');

  it('Invariant 1: Pure Determinism — identical inputs strictly produce identical outputs', () => {
    const initiator = [createPropertyItem('init-1', 4, 'CLEAN', 'western')];
    const partner = [
      createPropertyItem('part-1', 4, 'CLEAN', 'western'),
      createPropertyItem('part-2', 3, 'CLEAN', 'western'),
    ];

    const run1 = generateTwinningTiersEngine({
      initiatorItems: initiator,
      partnerWardrobe: partner,
      context: { targetFormality: 4, culturalStyle: 'western' },
      now,
    });

    const run2 = generateTwinningTiersEngine({
      initiatorItems: initiator,
      partnerWardrobe: partner,
      context: { targetFormality: 4, culturalStyle: 'western' },
      now,
    });

    expect(JSON.stringify(run1)).toEqual(JSON.stringify(run2));
  });

  it('Invariant 2: Dirty Non-Appearance — a dirty, in-wash, or dry-cleaning item never appears in an outfit', () => {
    const initiator = [createPropertyItem('init-1', 3, 'CLEAN', 'western')];
    const partner = [
      createPropertyItem('dirty-1', 3, 'DIRTY', 'western'),
      createPropertyItem('inwash-1', 3, 'IN_WASH', 'western'),
      createPropertyItem('dryclean-1', 3, 'DRY_CLEANING', 'western'),
      createPropertyItem('clean-1', 3, 'CLEAN', 'western'),
    ];

    const results = generateTwinningTiersEngine({
      initiatorItems: initiator,
      partnerWardrobe: partner,
      context: { targetFormality: 3, culturalStyle: 'western' },
      now,
    });

    for (const tier of results) {
      for (const item of tier.partnerOutfit) {
        expect(item.laundry_status).toBe('CLEAN');
        expect(item.id).not.toBe('dirty-1');
        expect(item.id).not.toBe('inwash-1');
        expect(item.id).not.toBe('dryclean-1');
      }
    }
  });

  it('Invariant 3: Formality Band — formality gap between recommended items and context never exceeds ±1', () => {
    const targetFormality: FormalityLevel = 3;
    const initiator = [createPropertyItem('init-1', targetFormality, 'CLEAN', 'western')];
    const partner = [
      createPropertyItem('low-1', 1, 'CLEAN', 'western'), // gap 2 (excluded)
      createPropertyItem('valid-2', 2, 'CLEAN', 'western'), // gap 1 (allowed)
      createPropertyItem('valid-3', 3, 'CLEAN', 'western'), // gap 0 (allowed)
      createPropertyItem('valid-4', 4, 'CLEAN', 'western'), // gap 1 (allowed)
      createPropertyItem('high-5', 5, 'CLEAN', 'western'), // gap 2 (excluded)
    ];

    const results = generateTwinningTiersEngine({
      initiatorItems: initiator,
      partnerWardrobe: partner,
      context: { targetFormality, culturalStyle: 'western' },
      now,
    });

    for (const tier of results) {
      for (const item of tier.partnerOutfit) {
        const gap = Math.abs(item.formality_level - targetFormality);
        expect(gap).toBeLessThanOrEqual(1);
      }
    }
  });
});

