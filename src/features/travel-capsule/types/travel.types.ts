import { CulturalStyle, WardrobeItem } from '@/types';

export interface TravelParams {
  destination: string;
  durationDays: number;
  season: 'Spring' | 'Summer' | 'Autumn' | 'Winter';
  culturalContext: CulturalStyle;
}

export interface TravelCapsuleResult {
  coreItems: WardrobeItem[];
  distinctOutfitCount: number;
  packingChecklist: { item: WardrobeItem; packed: boolean }[];
}
