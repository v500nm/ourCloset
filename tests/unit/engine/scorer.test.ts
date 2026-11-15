import { describe, it, expect } from 'vitest';
import {
  scorePairing,
  evaluateAccentAgreement,
  evaluateRecencyPenalty,
} from '@/engine/scoring/scorer';
import { SCORER_PROFILES } from '@/engine/scoring/profiles';
import { WardrobeItem } from '@/types';

function createMockGarment(opts: Partial<WardrobeItem>): WardrobeItem {
  return {
    id: 'garment-1',
    user_id: 'user-1',
    title: 'Garment',
    category: 'shirt',
    cultural_style: 'western',
    formality_level: 4,
    image_url: 'img.jpg',
    laundry_status: 'CLEAN',
    privacy_tier: 'PUBLIC',
    season_tags: ['all-season'],
    wear_count: 0,
    created_at: '2026-01-01T00:00:00Z',
    ...opts,
  };
}

describe('Scorer and Weight Profiles', () => {
  const refDate = new Date('2026-03-01T12:00:00Z');

  it('declares 3 distinct weight profiles over the unified scorer', () => {
    expect(SCORER_PROFILES.subtle.weights.colorHarmony).toBe(0.45);
    expect(SCORER_PROFILES.balanced.weights.formalityAlignment).toBe(0.30);
    expect(SCORER_PROFILES.direct.weights.styleCompatibility).toBe(0.35);
  });

  it('rewards matching hardware accents and penalizes metal clash', () => {
    const goldItemA = createMockGarment({ hardware_metal_color: 'gold' });
    const goldItemB = createMockGarment({ hardware_metal_color: 'gold' });
    const silverItem = createMockGarment({ hardware_metal_color: 'silver' });

    const match = evaluateAccentAgreement(goldItemA, goldItemB);
    expect(match.score).toBeGreaterThanOrEqual(0.9);

    const clash = evaluateAccentAgreement(goldItemA, silverItem);
    expect(clash.score).toBeLessThan(0.7);
  });

  it('applies recency lookback penalty when worn within 14 days', () => {
    // Worn 3 days ago
    const recentDate = new Date('2026-02-26T12:00:00Z');
    const recentItem = createMockGarment({ last_worn_at: recentDate.toISOString() });
    const recencyRecent = evaluateRecencyPenalty(recentItem, refDate);
    expect(recencyRecent.penalty).toBeGreaterThan(0.2);

    // Worn 20 days ago (outside 14-day lookback)
    const oldDate = new Date('2026-02-09T12:00:00Z');
    const oldItem = createMockGarment({ last_worn_at: oldDate.toISOString() });
    const recencyOld = evaluateRecencyPenalty(oldItem, refDate);
    expect(recencyOld.penalty).toBe(0);
  });

  it('scores pairings with comprehensive score breakdown', () => {
    const suit = createMockGarment({
      title: 'Navy Suit',
      primary_color_hex: '#0A1128',
      formality_level: 5,
      cultural_style: 'western',
      hardware_metal_color: 'silver',
    });

    const shirt = createMockGarment({
      title: 'White Oxford',
      primary_color_hex: '#FFFFFF',
      formality_level: 4,
      cultural_style: 'western',
      hardware_metal_color: 'silver',
    });

    const breakdown = scorePairing(suit, shirt, SCORER_PROFILES.balanced, refDate);
    expect(breakdown.totalScore).toBeGreaterThan(0.8);
    expect(breakdown.colorHarmony.score).toBeGreaterThan(0.9);
    expect(breakdown.formalityAlignment.gap).toBe(1);
    expect(breakdown.styleCompatibility.score).toBe(1.0);
  });
});

