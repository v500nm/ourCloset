import { TwinningTierOption } from '../types/twinning.types';
import { MOCK_WARDROBE } from '@/lib/mockData';

export async function generateTwinningTiers(
  eventContext: string
): Promise<TwinningTierOption[]> {
  const husbandSuit = MOCK_WARDROBE.find((i) => i.id === 'SU-NVY-01') || MOCK_WARDROBE[3];
  const wifeAbaya = MOCK_WARDROBE.find((i) => i.id === 'AB-BLK-01') || MOCK_WARDROBE[8];
  const wifeHijab = MOCK_WARDROBE.find((i) => i.id === 'HJ-SLK-02') || MOCK_WARDROBE[9];
  const husbandKurta = MOCK_WARDROBE.find((i) => i.id === 'KJ-WHT-01') || MOCK_WARDROBE[7];
  const husbandSherwani = MOCK_WARDROBE.find((i) => i.id === 'SK-GLD-01') || MOCK_WARDROBE[6];
  const wifeBlazer = MOCK_WARDROBE.find((i) => i.id === 'BL-LNN-01') || MOCK_WARDROBE[10];

  return [
    {
      tier: 'subtle',
      label: 'Subtle Harmony',
      description: 'Accessories & metal accents harmonize without direct color duplication.',
      colorWeight: 0.8,
      silhouetteWeight: 0.2,
      partnerOutfit: [wifeHijab, wifeBlazer],
      matchReason: 'Dusk mauve hijab matches navy suit lapel undertone & gold hardware accent.',
    },
    {
      tier: 'balanced',
      label: 'Balanced Co-Op',
      description: 'Formality index matched ±1 band with complementary palette weight.',
      colorWeight: 0.5,
      silhouetteWeight: 0.5,
      partnerOutfit: [wifeAbaya],
      matchReason: 'Formality 4 match. Linen abaya matches trench coat structure.',
    },
    {
      tier: 'direct',
      label: 'Direct Twinning',
      description: 'Identical cultural style & exact colorway pairing for festive events.',
      colorWeight: 0.3,
      silhouetteWeight: 0.7,
      partnerOutfit: [husbandSherwani],
      matchReason: 'Gold Zari zari work directly coordinates with gold embroidery accents.',
    },
  ];
}
