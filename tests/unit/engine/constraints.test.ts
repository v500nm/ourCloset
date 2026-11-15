import { describe, it, expect } from 'vitest';
import {
  evaluateHardConstraints,
  filterCandidates,
  EngineContext,
} from '@/engine/constraints/hardConstraints';
import { WardrobeItem } from '@/types';

function createMockItem(opts: Partial<WardrobeItem> = {}): WardrobeItem {
  return {
    id: 'test-item-01',
    user_id: 'test-user',
    title: 'Test Shirt',
    category: 'shirt',
    cultural_style: 'western',
    formality_level: 3,
    image_url: 'img.jpg',
    laundry_status: 'CLEAN',
    privacy_tier: 'PUBLIC',
    season_tags: ['all-season'],
    wear_count: 0,
    created_at: '2026-01-01T00:00:00Z',
    ...opts,
  };
}

describe('Engine Hard Constraints Pipeline', () => {
  const defaultContext: EngineContext = {
    targetFormality: 3,
    culturalStyle: 'western',
  };

  it('strictly rejects non-clean laundry statuses', () => {
    const cleanItem = createMockItem({ laundry_status: 'CLEAN' });
    const dirtyItem = createMockItem({ laundry_status: 'DIRTY' });
    const inWashItem = createMockItem({ laundry_status: 'IN_WASH' });
    const dryCleanItem = createMockItem({ laundry_status: 'DRY_CLEANING' });

    expect(evaluateHardConstraints(cleanItem, defaultContext).passed).toBe(true);
    expect(evaluateHardConstraints(dirtyItem, defaultContext).passed).toBe(false);
    expect(evaluateHardConstraints(inWashItem, defaultContext).passed).toBe(false);
    expect(evaluateHardConstraints(dryCleanItem, defaultContext).passed).toBe(false);
  });

  it('strictly enforces formality band within target ±1', () => {
    const target3Context: EngineContext = { targetFormality: 3 };

    expect(evaluateHardConstraints(createMockItem({ formality_level: 2 }), target3Context).passed).toBe(true);
    expect(evaluateHardConstraints(createMockItem({ formality_level: 3 }), target3Context).passed).toBe(true);
    expect(evaluateHardConstraints(createMockItem({ formality_level: 4 }), target3Context).passed).toBe(true);

    // Formality 1 (gap 2) or 5 (gap 2) must be excluded
    expect(evaluateHardConstraints(createMockItem({ formality_level: 1 }), target3Context).passed).toBe(false);
    expect(evaluateHardConstraints(createMockItem({ formality_level: 5 }), target3Context).passed).toBe(false);
  });

  it('enforces privacy boundary during partner twinning evaluation', () => {
    const publicItem = createMockItem({ privacy_tier: 'PUBLIC' });
    const privateItem = createMockItem({ privacy_tier: 'PRIVATE' });

    // In solo context, private items are permitted
    expect(evaluateHardConstraints(privateItem, { targetFormality: 3, isPartnerEvaluation: false }).passed).toBe(true);

    // In partner twinning context, private items are strictly filtered out
    expect(evaluateHardConstraints(publicItem, { targetFormality: 3, isPartnerEvaluation: true }).passed).toBe(true);
    expect(evaluateHardConstraints(privateItem, { targetFormality: 3, isPartnerEvaluation: true }).passed).toBe(false);
  });

  it('filters out delicate fabrics during heavy precipitation', () => {
    const silkItem = createMockItem({ fabric_type: 'silk' });
    const cottonItem = createMockItem({ fabric_type: 'cotton' });

    const rainyContext: EngineContext = {
      targetFormality: 3,
      weather: { temperatureCelsius: 22, isRaining: true, precipitationProbability: 80 },
    };

    expect(evaluateHardConstraints(cottonItem, rainyContext).passed).toBe(true);
    expect(evaluateHardConstraints(silkItem, rainyContext).passed).toBe(false);
  });

  it('filters candidate lists comprehensively', () => {
    const items = [
      createMockItem({ id: '1', laundry_status: 'CLEAN', formality_level: 3 }),
      createMockItem({ id: '2', laundry_status: 'DIRTY', formality_level: 3 }),
      createMockItem({ id: '3', laundry_status: 'CLEAN', formality_level: 5 }), // formality gap > 1
      createMockItem({ id: '4', laundry_status: 'CLEAN', formality_level: 4 }),
    ];

    const valid = filterCandidates(items, defaultContext);
    expect(valid).toHaveLength(2);
    expect(valid.map((i) => i.id)).toEqual(['1', '4']);
  });
});

