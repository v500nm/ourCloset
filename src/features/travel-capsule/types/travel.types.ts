import { CulturalStyle, WardrobeItem } from '@/types';

export interface TravelParams {
  destination: string;
  durationDays: number;
  season: 'Spring' | 'Summer' | 'Autumn' | 'Winter';
  culturalContext: CulturalStyle;
}

export interface OutfitCombination {
  id: string;
  items: WardrobeItem[];
  score: number;
  reason: string;
}

export interface TravelCapsuleResult {
  coreItems: WardrobeItem[];
  distinctOutfitCount: number;
  packingChecklist: { item: WardrobeItem; packed: boolean }[];
  validCombinations?: OutfitCombination[];
  packingRatio?: number;
}
