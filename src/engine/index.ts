import { WardrobeItem, CulturalStyle } from '@/types';
import { TwinningTierOption } from '@/features/twinning/types/twinning.types';
import { filterCandidates, EngineContext } from './constraints/hardConstraints';
import { SCORER_PROFILES, TwinningTier } from './scoring/profiles';
import { getTemplateForStyle } from './templates/slotTemplates';
import { beamSearchOutfits, OutfitCandidate } from './search/beamSearch';

export * from './color';
export * from './constraints/hardConstraints';
export * from './scoring/profiles';
export * from './scoring/scorer';
export * from './scoring/recency';
export * from './templates/slotTemplates';
export * from './search/beamSearch';
export * from './explainability/reasonGenerator';

export interface TwinningEngineRequest {
  initiatorItems: WardrobeItem[];
  partnerWardrobe: WardrobeItem[];
  context: EngineContext;
  now: Date;
}

export interface TwinningTierResult extends TwinningTierOption {
  score: number;
  candidate?: OutfitCandidate;
}

/**
 * Main Pure Engine Facade: generates the 3 twinning tier recommendations (subtle, balanced, direct)
 * using the unified constraint-pruned beam search over OKLCH color harmony and cultural slot templates.
 * Zero React, zero IDB, zero side-effects.
 */
export function generateTwinningTiersEngine(
  request: TwinningEngineRequest
): TwinningTierResult[] {
  const { initiatorItems, partnerWardrobe, context, now } = request;
  const initiatorAnchor = initiatorItems[0];

  // 1. Hard constraint pruning on partner candidates
  const validPartnerCandidates = filterCandidates(partnerWardrobe, context);

  // 2. Determine cultural template
  const targetStyle: CulturalStyle = context.culturalStyle || initiatorAnchor?.cultural_style || 'western';
  const hasCombo = validPartnerCandidates.some((i) => i.category === 'traditional_combo' || i.category === 'suit');
  const template = getTemplateForStyle(targetStyle, hasCombo);

  // 3. Evaluate each of the three tiers over their respective weight profiles
  const tiers: TwinningTier[] = ['subtle', 'balanced', 'direct'];

  return tiers.map((tier) => {
    const profile = SCORER_PROFILES[tier];
    const searchResult = beamSearchOutfits(
      validPartnerCandidates,
      template,
      profile,
      now,
      initiatorAnchor
    );

    const bestOutfit = searchResult.outfits[0];
    const partnerOutfit = bestOutfit ? bestOutfit.items : [];
    const matchReason = bestOutfit ? bestOutfit.matchReason : 'No complementary garments found meeting constraints.';
    const score = bestOutfit ? bestOutfit.totalScore : 0;

    return {
      tier,
      label: profile.label,
      description: profile.description,
      colorWeight: profile.weights.colorHarmony,
      silhouetteWeight: profile.weights.styleCompatibility,
      partnerOutfit,
      matchReason,
      score,
      candidate: bestOutfit,
    };
  });
}

