import { TwinningTierOption } from '../types/twinning.types';
import { WardrobeItem, FormalityLevel, CulturalStyle } from '@/types';
import { wardrobeRepository } from '@/data/repositories/wardrobeRepository';
import { generateTwinningTiersEngine } from '@/engine';
import { getSampleWardrobe } from '@/data/seed/sampleWardrobe';

/**
 * Connects the pure outfit engine to the front-end twinning service.
 * Zero mock imports. Queries typed IndexedDB repository with graceful fallbacks.
 */
export async function generateTwinningTiers(
  eventContext: string,
  initiatorItems?: WardrobeItem[],
  partnerWardrobe?: WardrobeItem[]
): Promise<TwinningTierOption[]> {
  const now = new Date();

  // 1. Resolve wardrobe sources
  let allItems: WardrobeItem[] = [];
  if (!initiatorItems || !partnerWardrobe) {
    allItems = await wardrobeRepository.getAll();
    if (allItems.length === 0) {
      allItems = getSampleWardrobe();
    }
  }

  // Identify initiator items (e.g. husband / initiator) and partner items (e.g. wife)
  const resolvedInitiator =
    initiatorItems && initiatorItems.length > 0
      ? initiatorItems
      : allItems.filter((i) => i.user_id === 'm-adnan' || i.user_id.includes('husband'));

  const resolvedPartner =
    partnerWardrobe && partnerWardrobe.length > 0
      ? partnerWardrobe
      : allItems.filter((i) => i.user_id !== 'm-adnan' && !i.user_id.includes('husband'));

  // Fallbacks if one side is empty
  const finalInitiator = resolvedInitiator.length > 0 ? resolvedInitiator : allItems.slice(0, 3);
  const finalPartner = resolvedPartner.length > 0 ? resolvedPartner : allItems.slice(3);

  // Derive target formality and cultural style from eventContext
  let targetFormality: FormalityLevel = 4;
  let culturalStyle: CulturalStyle = finalInitiator[0]?.cultural_style || 'western';

  const contextLower = eventContext.toLowerCase();
  if (contextLower.includes('wedding') || contextLower.includes('gala') || contextLower.includes('reception')) {
    targetFormality = 5;
  } else if (contextLower.includes('office') || contextLower.includes('review') || contextLower.includes('dinner')) {
    targetFormality = 3;
  } else if (contextLower.includes('casual') || contextLower.includes('brunch') || contextLower.includes('house')) {
    targetFormality = 2;
  }

  if (contextLower.includes('sangeet') || contextLower.includes('mehendi') || contextLower.includes('diwali') || contextLower.includes('shaadi')) {
    culturalStyle = 'indian_traditional';
  } else if (contextLower.includes('eid') || contextLower.includes('jummah') || contextLower.includes('walima') || contextLower.includes('modest')) {
    culturalStyle = 'islamic_modest';
  }

  // Execute pure outfit engine
  const tierResults = generateTwinningTiersEngine({
    initiatorItems: finalInitiator,
    partnerWardrobe: finalPartner,
    context: {
      targetFormality,
      culturalStyle,
      modestyFloor: culturalStyle === 'islamic_modest',
    },
    now,
  });

  return tierResults.map((tr) => ({
    tier: tr.tier,
    label: tr.label,
    description: tr.description,
    colorWeight: tr.colorWeight,
    silhouetteWeight: tr.silhouetteWeight,
    partnerOutfit: tr.partnerOutfit,
    matchReason: tr.matchReason,
  }));
}
