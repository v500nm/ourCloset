import { describe, it, expect } from 'vitest';
import { beamSearchOutfits } from '@/engine/search/beamSearch';
import { getTemplateForStyle } from '@/engine/templates/slotTemplates';
import { SCORER_PROFILES } from '@/engine/scoring/profiles';
import { WardrobeItem } from '@/types';

function createItem(
  id: string,
  category: WardrobeItem['category'],
  cultural_style: WardrobeItem['cultural_style'],
  primary_color_hex: string,
  formality_level: WardrobeItem['formality_level'],
  title: string
): WardrobeItem {
  return {
    id,
    user_id: 'u1',
    title,
    category,
    cultural_style,
    primary_color_hex,
    formality_level,
    image_url: 'img.jpg',
    laundry_status: 'CLEAN',
    privacy_tier: 'PUBLIC',
    season_tags: ['all-season'],
    wear_count: 0,
    created_at: '2026-01-01T00:00:00Z',
  };
}

describe('Beam Search Outfit Assembly & Edge Cases', () => {
  const profile = SCORER_PROFILES.balanced;
  const now = new Date('2026-03-01T12:00:00Z');
  const template = getTemplateForStyle('western', false);

  it('handles empty candidate wardrobe gracefully with 0 outfits and no crash', () => {
    const result = beamSearchOutfits([], template, profile, now);
    expect(result.isEmpty).toBe(true);
    expect(result.outfits).toHaveLength(0);
    expect(result.message).toContain('0 items');
  });

  it('handles single-item wardrobe gracefully with partial outfit and no crash', () => {
    const single = createItem('single-1', 'shirt', 'western', '#FFFFFF', 3, 'Single Shirt');
    const result = beamSearchOutfits([single], template, profile, now);

    expect(result.isEmpty).toBe(false);
    expect(result.outfits).toHaveLength(1);
    expect(result.outfits[0].items).toHaveLength(1);
    expect(result.outfits[0].items[0].id).toBe('single-1');
  });

  it('assembles multi-piece outfit satisfying required slots', () => {
    const candidates = [
      createItem('shirt-1', 'shirt', 'western', '#FFFFFF', 3, 'White Oxford'),
      createItem('shirt-2', 'shirt', 'western', '#FF00FF', 3, 'Neon Shirt'),
      createItem('pants-1', 'pants', 'western', '#0A192F', 3, 'Navy Chinos'),
      createItem('shoes-1', 'footwear', 'western', '#050505', 3, 'Black Loafers'),
    ];

    const result = beamSearchOutfits(candidates, template, profile, now);
    expect(result.isEmpty).toBe(false);
    expect(result.outfits.length).toBeGreaterThan(0);

    const topOutfit = result.outfits[0];
    const itemIds = topOutfit.items.map((i) => i.id);
    // Best match should pair white oxford with navy chinos
    expect(itemIds).toContain('shirt-1');
    expect(itemIds).toContain('pants-1');
  });
});

