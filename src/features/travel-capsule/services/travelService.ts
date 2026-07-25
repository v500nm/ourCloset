import { TravelCapsuleResult, TravelParams } from '../types/travel.types';
import { MOCK_WARDROBE } from '@/lib/mockData';

export async function generateCapsule(params: TravelParams): Promise<TravelCapsuleResult> {
  const filtered = MOCK_WARDROBE.filter(
    (i) => i.laundry_status === 'CLEAN' && i.cultural_style === params.culturalContext
  );

  const coreItems = filtered.length > 0 ? filtered.slice(0, 4) : MOCK_WARDROBE.slice(0, 4);

  return {
    coreItems,
    distinctOutfitCount: coreItems.length * 6,
    packingChecklist: coreItems.map((item) => ({ item, packed: false })),
  };
}
