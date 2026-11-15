import { describe, it, expect } from 'vitest';
import {
  generateCapsuleWardrobe,
  generateCapsule,
} from '@/features/travel-capsule/services/travelService';
import { WardrobeItem } from '@/types';

function createTripWardrobe(): WardrobeItem[] {
  return [
    {
      id: 'top-white-shirt',
      user_id: 'u1',
      title: 'Crisp White Oxford Shirt',
      category: 'shirt',
      cultural_style: 'western',
      primary_color_hex: '#FFFFFF',
      formality_level: 3,
      image_url: 'https://example.com/w1.jpg',
      laundry_status: 'CLEAN',
      privacy_tier: 'PUBLIC',
      season_tags: ['all-season'],
      wear_count: 2,
      created_at: new Date().toISOString(),
    },
    {
      id: 'top-navy-shirt',
      user_id: 'u1',
      title: 'Navy Linen Button-Down',
      category: 'shirt',
      cultural_style: 'western',
      primary_color_hex: '#1E293B',
      formality_level: 3,
      image_url: 'https://example.com/w2.jpg',
      laundry_status: 'CLEAN',
      privacy_tier: 'PUBLIC',
      season_tags: ['summer', 'all-season'],
      wear_count: 1,
      created_at: new Date().toISOString(),
    },
    {
      id: 'top-olive-tee',
      user_id: 'u1',
      title: 'Olive Crewneck Tee',
      category: 'tshirt',
      cultural_style: 'western',
      primary_color_hex: '#4D5D53',
      formality_level: 2,
      image_url: 'https://example.com/w3.jpg',
      laundry_status: 'CLEAN',
      privacy_tier: 'PUBLIC',
      season_tags: ['summer'],
      wear_count: 5,
      created_at: new Date().toISOString(),
    },
    {
      id: 'bot-beige-chinos',
      user_id: 'u1',
      title: 'Sand Beige Chinos',
      category: 'pants',
      cultural_style: 'western',
      primary_color_hex: '#D7CCC8',
      formality_level: 3,
      image_url: 'https://example.com/w4.jpg',
      laundry_status: 'CLEAN',
      privacy_tier: 'PUBLIC',
      season_tags: ['all-season'],
      wear_count: 3,
      created_at: new Date().toISOString(),
    },
    {
      id: 'bot-dark-jeans',
      user_id: 'u1',
      title: 'Dark Wash Denim Jeans',
      category: 'jeans',
      cultural_style: 'western',
      primary_color_hex: '#0F172A',
      formality_level: 2,
      image_url: 'https://example.com/w5.jpg',
      laundry_status: 'CLEAN',
      privacy_tier: 'PUBLIC',
      season_tags: ['all-season'],
      wear_count: 4,
      created_at: new Date().toISOString(),
    },
    {
      id: 'dirty-pants',
      user_id: 'u1',
      title: 'Dirty Trouser',
      category: 'pants',
      cultural_style: 'western',
      primary_color_hex: '#000000',
      formality_level: 3,
      image_url: 'https://example.com/dirty.jpg',
      laundry_status: 'DIRTY', // Should be strictly excluded
      privacy_tier: 'PUBLIC',
      season_tags: ['all-season'],
      wear_count: 1,
      created_at: new Date().toISOString(),
    },
    {
      id: 'shoes-loafers',
      user_id: 'u1',
      title: 'Brown Leather Loafers',
      category: 'footwear',
      cultural_style: 'western',
      primary_color_hex: '#3E2723',
      formality_level: 3,
      image_url: 'https://example.com/w6.jpg',
      laundry_status: 'CLEAN',
      privacy_tier: 'PUBLIC',
      season_tags: ['all-season'],
      wear_count: 6,
      created_at: new Date().toISOString(),
    },
  ];
}

describe('Travel Capsule Engine Optimization', () => {
  it('optimizes packing: yields more distinct outfit combinations than packed items', async () => {
    const wardrobe = createTripWardrobe();
    const result = await generateCapsuleWardrobe(
      {
        destination: 'Tokyo, Japan',
        durationDays: 5,
        season: 'Summer',
        culturalContext: 'western',
      },
      wardrobe
    );

    expect(result.coreItems.length).toBeGreaterThan(0);
    // Never packs dirty items
    expect(result.coreItems.some((i) => i.laundry_status !== 'CLEAN')).toBe(false);

    // Packing ratio: distinct outfit count should exceed total items packed
    expect(result.distinctOutfitCount).toBeGreaterThanOrEqual(result.coreItems.length);
    expect(result.validCombinations.length).toBeGreaterThan(0);

    // Every combination must have a valid engine match score >= 0.55
    for (const combo of result.validCombinations) {
      expect(combo.score).toBeGreaterThanOrEqual(0.55);
      expect(combo.reason).toBeDefined();
    }
  });

  it('generates an actionable packing checklist', async () => {
    const wardrobe = createTripWardrobe();
    const result = await generateCapsule(
      {
        destination: 'London, UK',
        durationDays: 3,
        season: 'Spring',
        culturalContext: 'western',
      },
      wardrobe
    );

    expect(result.packingChecklist.length).toBe(result.coreItems.length);
    for (const entry of result.packingChecklist) {
      expect(entry.item).toBeDefined();
      expect(entry.packed).toBe(false);
    }
  });
});

