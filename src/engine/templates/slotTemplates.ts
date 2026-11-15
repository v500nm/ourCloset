import { CulturalStyle, ItemCategory } from '@/types';

export type SlotRole =
  | 'top'
  | 'bottom'
  | 'combo' // suit, traditional_combo (sherwani, saree, abaya)
  | 'head_covering' // hijab, dupatta, safa
  | 'outer' // blazer, overcoat
  | 'footwear'
  | 'accessory';

export interface CulturalSlotTemplate {
  id: string;
  name: string;
  culturalStyle: CulturalStyle;
  requiredSlots: SlotRole[];
  optionalSlots: SlotRole[];
}

export const CULTURAL_SLOT_TEMPLATES: CulturalSlotTemplate[] = [
  // 1. Western Separates (Top + Bottom)
  {
    id: 'western_separates',
    name: 'Western Separates',
    culturalStyle: 'western',
    requiredSlots: ['top', 'bottom'],
    optionalSlots: ['outer', 'footwear', 'accessory'],
  },
  // 2. Western Tailored Suit
  {
    id: 'western_suit',
    name: 'Western Tailored Suit',
    culturalStyle: 'western',
    requiredSlots: ['combo', 'top'],
    optionalSlots: ['footwear', 'accessory'],
  },
  // 3. Indian Traditional Ensemble (Sherwani, Kurta Pajama, or Saree)
  {
    id: 'indian_traditional_ensemble',
    name: 'Indian Traditional Ensemble',
    culturalStyle: 'indian_traditional',
    requiredSlots: ['combo'],
    optionalSlots: ['footwear', 'accessory'],
  },
  // 4. Islamic Modest Abaya & Hijab
  {
    id: 'islamic_modest_abaya_hijab',
    name: 'Islamic Modest Abaya & Hijab',
    culturalStyle: 'islamic_modest',
    requiredSlots: ['combo', 'head_covering'],
    optionalSlots: ['outer', 'footwear', 'accessory'],
  },
  // 5. Islamic Modest Tunic & Modest Trousers
  {
    id: 'islamic_modest_separates',
    name: 'Islamic Modest Separates',
    culturalStyle: 'islamic_modest',
    requiredSlots: ['top', 'bottom', 'head_covering'],
    optionalSlots: ['outer', 'footwear', 'accessory'],
  },
];

/**
 * Maps an item's category and attributes to a candidate SlotRole.
 */
export function categorizeItemToSlot(
  category: ItemCategory,
  title = '',
  culturalStyle: CulturalStyle = 'western'
): SlotRole {
  switch (category) {
    case 'shirt':
    case 'tshirt':
      return 'top';

    case 'pants':
    case 'jeans':
      return 'bottom';

    case 'suit':
      return 'combo';

    case 'traditional_combo':
      return 'combo';

    case 'footwear':
      return 'footwear';

    case 'belt':
    case 'watch':
      return 'accessory';

    case 'accessory':
      // Detect head coverings by title keywords or cultural context
      const lower = title.toLowerCase();
      if (
        lower.includes('hijab') ||
        lower.includes('dupatta') ||
        lower.includes('turban') ||
        lower.includes('safa') ||
        culturalStyle === 'islamic_modest'
      ) {
        return 'head_covering';
      }
      return 'accessory';

    default:
      return 'top';
  }
}

/**
 * Selects the optimal slot template for a given cultural style and available garment set.
 */
export function getTemplateForStyle(
  style: CulturalStyle,
  hasComboItem = false
): CulturalSlotTemplate {
  if (style === 'indian_traditional') {
    return CULTURAL_SLOT_TEMPLATES.find((t) => t.id === 'indian_traditional_ensemble')!;
  }
  if (style === 'islamic_modest') {
    return hasComboItem
      ? CULTURAL_SLOT_TEMPLATES.find((t) => t.id === 'islamic_modest_abaya_hijab')!
      : CULTURAL_SLOT_TEMPLATES.find((t) => t.id === 'islamic_modest_separates')!;
  }
  // Western
  return hasComboItem
    ? CULTURAL_SLOT_TEMPLATES.find((t) => t.id === 'western_suit')!
    : CULTURAL_SLOT_TEMPLATES.find((t) => t.id === 'western_separates')!;
}

