import { WardrobeItem } from '@/types';
import { CulturalSlotTemplate, categorizeItemToSlot, SlotRole } from '../templates/slotTemplates';
import { scorePairing, ScoreBreakdown } from '../scoring/scorer';
import { ScorerWeightProfile } from '../scoring/profiles';
import { generateMatchReason } from '../explainability/reasonGenerator';

export interface OutfitCandidate {
  items: WardrobeItem[];
  totalScore: number;
  matchReason: string;
  breakdown: ScoreBreakdown;
  slotsFulfilled: SlotRole[];
  missingSlots: SlotRole[];
}

export interface BeamSearchResult {
  outfits: OutfitCandidate[];
  isEmpty: boolean;
  message?: string;
  executionTimeMs: number;
}

interface BeamNode {
  items: WardrobeItem[];
  score: number;
  breakdowns: ScoreBreakdown[];
  fulfilledSlots: SlotRole[];
}

/**
 * Executes a constrained beam search over slot templates to assemble coherent outfits.
 * Guarantees graceful degradation on empty or single-item wardrobes without crashing.
 */
export function beamSearchOutfits(
  candidates: WardrobeItem[],
  template: CulturalSlotTemplate,
  profile: ScorerWeightProfile,
  now: Date,
  partnerAnchorItem?: WardrobeItem,
  beamWidth = 5
): BeamSearchResult {
  const startTime = performance.now();

  // 1. Edge Case: Empty wardrobe
  if (candidates.length === 0) {
    return {
      outfits: [],
      isEmpty: true,
      message: 'Wardrobe contains 0 items matching the criteria.',
      executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
    };
  }

  // 2. Edge Case: Single item wardrobe
  if (candidates.length === 1) {
    const single = candidates[0];
    const dummyBreakdown = partnerAnchorItem
      ? scorePairing(single, partnerAnchorItem, profile, now)
      : scorePairing(single, single, profile, now);

    return {
      outfits: [
        {
          items: [single],
          totalScore: dummyBreakdown.totalScore,
          matchReason: `Single available garment: ${single.title}.`,
          breakdown: dummyBreakdown,
          slotsFulfilled: [categorizeItemToSlot(single.category, single.title, single.cultural_style)],
          missingSlots: template.requiredSlots.slice(1),
        },
      ],
      isEmpty: false,
      message: 'Single item available; partial outfit returned.',
      executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
    };
  }

  // 3. Bucket candidates by slot role
  const buckets = new Map<SlotRole, WardrobeItem[]>();
  for (const item of candidates) {
    const slot = categorizeItemToSlot(item.category, item.title, item.cultural_style);
    const existing = buckets.get(slot) || [];
    existing.push(item);
    buckets.set(slot, existing);
  }

  // 4. Assemble slot evaluation order
  const slotSequence: SlotRole[] = [...template.requiredSlots, ...template.optionalSlots];

  // 5. Initialize beam with empty state
  let currentBeam: BeamNode[] = [
    {
      items: [],
      score: 1.0,
      breakdowns: [],
      fulfilledSlots: [],
    },
  ];

  for (const slot of slotSequence) {
    const candidatesInSlot = buckets.get(slot) || [];
    if (candidatesInSlot.length === 0) {
      continue;
    }

    const nextBeamCandidates: BeamNode[] = [];

    for (const node of currentBeam) {
      for (const item of candidatesInSlot) {
        // Prevent duplicate items within an outfit
        if (node.items.some((i) => i.id === item.id)) {
          continue;
        }

        // Score this item against the partner anchor (if twinning) or existing items (if solo)
        let itemBreakdown: ScoreBreakdown;
        if (partnerAnchorItem) {
          itemBreakdown = scorePairing(item, partnerAnchorItem, profile, now);
        } else if (node.items.length > 0) {
          itemBreakdown = scorePairing(item, node.items[0], profile, now);
        } else {
          itemBreakdown = scorePairing(item, item, profile, now);
        }

        const newItems = [...node.items, item];
        const newBreakdowns = [...node.breakdowns, itemBreakdown];
        const combinedScore =
          newBreakdowns.reduce((sum, b) => sum + b.totalScore, 0) / newBreakdowns.length;

        nextBeamCandidates.push({
          items: newItems,
          score: combinedScore,
          breakdowns: newBreakdowns,
          fulfilledSlots: [...node.fulfilledSlots, slot],
        });
      }
    }

    if (nextBeamCandidates.length > 0) {
      // Retain top K nodes
      nextBeamCandidates.sort((a, b) => b.score - a.score);
      currentBeam = nextBeamCandidates.slice(0, beamWidth);
    }
  }

  // If beam search couldn't fill required slots (e.g. only shirts, no pants),
  // fallback to highest scoring candidate items
  if (currentBeam.length === 0 || currentBeam[0].items.length === 0) {
    const sorted = [...candidates].sort((a, b) => {
      const sA = partnerAnchorItem ? scorePairing(a, partnerAnchorItem, profile, now).totalScore : 0.5;
      const sB = partnerAnchorItem ? scorePairing(b, partnerAnchorItem, profile, now).totalScore : 0.5;
      return sB - sA;
    });

    const fallbackItem = sorted[0];
    const fallbackBreakdown = partnerAnchorItem
      ? scorePairing(fallbackItem, partnerAnchorItem, profile, now)
      : scorePairing(fallbackItem, fallbackItem, profile, now);

    return {
      outfits: [
        {
          items: [fallbackItem],
          totalScore: fallbackBreakdown.totalScore,
          matchReason: `Curated best match: ${fallbackItem.title}.`,
          breakdown: fallbackBreakdown,
          slotsFulfilled: [categorizeItemToSlot(fallbackItem.category, fallbackItem.title, fallbackItem.cultural_style)],
          missingSlots: template.requiredSlots,
        },
      ],
      isEmpty: false,
      message: 'Partial match generated due to slot category constraints.',
      executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
    };
  }

  // Map beam nodes to clean candidate outputs
  const outfits: OutfitCandidate[] = currentBeam.map((node) => {
    const primaryItem = node.items[0];
    const primaryBreakdown = node.breakdowns[0] || scorePairing(primaryItem, primaryItem, profile, now);
    const reason = partnerAnchorItem
      ? generateMatchReason(primaryBreakdown, partnerAnchorItem, primaryItem, profile)
      : generateMatchReason(primaryBreakdown, primaryItem, node.items[1] || primaryItem, profile);

    const missing = template.requiredSlots.filter((slot) => !node.fulfilledSlots.includes(slot));

    return {
      items: node.items,
      totalScore: Number(node.score.toFixed(3)),
      matchReason: reason,
      breakdown: primaryBreakdown,
      slotsFulfilled: node.fulfilledSlots,
      missingSlots: missing,
    };
  });

  return {
    outfits,
    isEmpty: false,
    executionTimeMs: Number((performance.now() - startTime).toFixed(2)),
  };
}

