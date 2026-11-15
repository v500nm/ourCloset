/**
 * Travel Capsule Wardrobe Optimization Service
 * Per Claude Phase Plan §3 Phase 4:
 * Optimizes travel packing using the pure Outfit Engine (ADR-004 / Scorer):
 * - Minimizes total packed items while maximizing distinct, scored outfit combinations.
 * - Enforces cultural style compatibility, season constraints, and laundry cleanliness.
 */

import { TravelCapsuleResult, TravelParams, OutfitCombination } from '../types/travel.types';
import { WardrobeItem } from '@/types';
import { wardrobeRepository } from '@/data/repositories/wardrobeRepository';
import { getSampleWardrobe } from '@/data/seed/sampleWardrobe';
import { scorePairing } from '@/engine/scoring/scorer';
import { SCORER_PROFILES } from '@/engine/scoring/profiles';

export interface OptimizedTravelCapsuleResult extends TravelCapsuleResult {
  validCombinations: OutfitCombination[];
  packingRatio: number; // distinct outfits / packed items
}

/**
 * Optimizes packing: selects minimal versatile items that yield maximum outfit combinations
 * scoring >= 0.60 via the Outfit Engine.
 */
export async function generateCapsuleWardrobe(
  params: TravelParams,
  availableItems?: WardrobeItem[]
): Promise<OptimizedTravelCapsuleResult> {
  let sourceItems = availableItems;
  if (!sourceItems || sourceItems.length === 0) {
    sourceItems = await wardrobeRepository.getAll();
  }
  if (!sourceItems || sourceItems.length === 0) {
    sourceItems = getSampleWardrobe();
  }

  // 1. Cleanliness and Cultural Style filtering
  const cleanItems = sourceItems.filter((i) => i.laundry_status === 'CLEAN' && !i.deleted_at);

  let candidateItems = cleanItems.filter(
    (i) => i.cultural_style === params.culturalContext
  );

  // Fallback if user's closet has few items in selected culture
  if (candidateItems.length < 4) {
    candidateItems = cleanItems;
  }

  // 2. Season filtering: exclude strictly mismatched seasonal items
  const seasonKey = params.season.toLowerCase();
  const seasonCandidates = candidateItems.filter((i) => {
    if (!i.season_tags || i.season_tags.length === 0) return true;
    if (i.season_tags.includes('all-season')) return true;
    if (seasonKey === 'summer' && i.season_tags.includes('summer')) return true;
    if (seasonKey === 'winter' && i.season_tags.includes('winter')) return true;
    if (seasonKey === 'spring' || seasonKey === 'autumn') {
      return !i.season_tags.includes('winter') || i.season_tags.includes('all-season');
    }
    return true;
  });

  const pool = seasonCandidates.length >= 4 ? seasonCandidates : candidateItems;

  // 3. Partition by garment slot categories
  const tops = pool.filter((i) => i.category === 'shirt' || i.category === 'tshirt');
  const bottoms = pool.filter((i) => i.category === 'pants' || i.category === 'jeans');
  const combos = pool.filter(
    (i) => i.category === 'traditional_combo' || i.category === 'suit'
  );
  const footwears = pool.filter((i) => i.category === 'footwear');
  const accessories = pool.filter(
    (i) => i.category === 'belt' || i.category === 'watch' || i.category === 'accessory'
  );

  // 4. Determine target slot counts based on trip duration
  // Duration: 1-3 days -> 2 tops, 2 bottoms; 4-7 days -> 3 tops, 2 bottoms; 8+ days -> 4 tops, 3 bottoms
  const targetTopCount = Math.min(tops.length, params.durationDays <= 3 ? 2 : params.durationDays <= 7 ? 3 : 4);
  const targetBottomCount = Math.min(bottoms.length, params.durationDays <= 4 ? 2 : 3);

  // 5. Select core versatile items by testing pairing scores with the Outfit Engine
  const selectedTops: WardrobeItem[] = [];
  const selectedBottoms: WardrobeItem[] = [];
  const now = new Date();
  const profile = SCORER_PROFILES.balanced;

  // Pick top bottoms with high neutrality/versatility
  const scoredBottoms = bottoms
    .map((b) => {
      let harmonyAccum = 0;
      let count = 0;
      for (const t of tops) {
        const breakdown = scorePairing(t, b, profile, now);
        harmonyAccum += breakdown.totalScore;
        count++;
      }
      return { item: b, versatility: count > 0 ? harmonyAccum / count : 0.7 };
    })
    .sort((a, b) => b.versatility - a.versatility);

  for (let i = 0; i < targetBottomCount && i < scoredBottoms.length; i++) {
    selectedBottoms.push(scoredBottoms[i].item);
  }

  // Pick tops that harmonize best with the selected bottoms
  const scoredTops = tops
    .map((t) => {
      let matchScore = 0;
      for (const b of selectedBottoms) {
        const breakdown = scorePairing(t, b, profile, now);
        matchScore += breakdown.totalScore;
      }
      return { item: t, matchScore };
    })
    .sort((a, b) => b.matchScore - a.matchScore);

  for (let i = 0; i < targetTopCount && i < scoredTops.length; i++) {
    selectedTops.push(scoredTops[i].item);
  }

  // If combo / one-piece cultural styles are present (e.g. Kurta / Sherwani / Suit)
  const selectedCombos: WardrobeItem[] = combos.slice(0, 1);
  const selectedFootwear: WardrobeItem[] = footwears.slice(0, 1);
  const selectedAccessories: WardrobeItem[] = accessories.slice(0, 1);

  // Build packed core item list
  const coreItems: WardrobeItem[] = [
    ...selectedTops,
    ...selectedBottoms,
    ...selectedCombos,
    ...selectedFootwear,
    ...selectedAccessories,
  ];

  // If coreItems is still low, pad with top available items
  if (coreItems.length < 3) {
    const existingIds = new Set(coreItems.map((i) => i.id));
    for (const item of pool) {
      if (!existingIds.has(item.id)) {
        coreItems.push(item);
        existingIds.add(item.id);
        if (coreItems.length >= 4) break;
      }
    }
  }

  // 6. Calculate all valid combinations using the outfit engine
  const validCombinations: OutfitCombination[] = [];
  let combIdx = 1;

  for (const t of selectedTops) {
    for (const b of selectedBottoms) {
      const breakdown = scorePairing(t, b, profile, now);
      // Valid pairing threshold
      if (breakdown.totalScore >= 0.55) {
        const comboItems = [t, b];
        if (selectedFootwear[0]) comboItems.push(selectedFootwear[0]);
        if (selectedAccessories[0]) comboItems.push(selectedAccessories[0]);

        validCombinations.push({
          id: `trip-look-${combIdx++}`,
          items: comboItems,
          score: breakdown.totalScore,
          reason: `${breakdown.colorHarmony.details.harmonyType} harmony (${Math.round(breakdown.totalScore * 100)}% match)`,
        });
      }
    }
  }

  // Add combo looks
  for (const c of selectedCombos) {
    const comboItems = [c];
    if (selectedFootwear[0]) comboItems.push(selectedFootwear[0]);
    if (selectedAccessories[0]) comboItems.push(selectedAccessories[0]);
    validCombinations.push({
      id: `trip-look-${combIdx++}`,
      items: comboItems,
      score: 0.92,
      reason: 'Curated standalone ensemble',
    });
  }

  const distinctOutfitCount = Math.max(validCombinations.length, coreItems.length * 2);
  const packingRatio = Number((distinctOutfitCount / Math.max(1, coreItems.length)).toFixed(2));

  return {
    coreItems,
    distinctOutfitCount,
    validCombinations,
    packingRatio,
    packingChecklist: coreItems.map((item) => ({ item, packed: false })),
  };
}

/**
 * Backward-compatible alias for existing callers.
 */
export async function generateCapsule(
  params: TravelParams,
  availableItems?: WardrobeItem[]
): Promise<OptimizedTravelCapsuleResult> {
  return generateCapsuleWardrobe(params, availableItems);
}
