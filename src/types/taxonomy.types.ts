export type CulturalStyle = 'western' | 'indian_traditional' | 'islamic_modest';
export type FormalityLevel = 1 | 2 | 3 | 4 | 5;
export type LaundryStatus = 'CLEAN' | 'DIRTY' | 'IN_WASH' | 'DRY_CLEANING';
export type PrivacyTier = 'PUBLIC' | 'PRIVATE';
export type FabricType = 'cotton' | 'linen' | 'silk' | 'georgette' | 'wool' | 'chiffon' | 'denim' | 'leather' | 'satin' | 'other';
export type SeasonTag = 'summer' | 'monsoon' | 'winter' | 'all-season';

export type ItemCategory =
  | 'shirt'
  | 'tshirt'
  | 'pants'
  | 'jeans'
  | 'nightwear'
  | 'suit'
  | 'traditional_combo'
  | 'footwear'
  | 'belt'
  | 'watch'
  | 'accessory';

export type HardwareMetalColor = 'gold' | 'silver' | 'rose_gold' | 'black';
export type LeatherTone = 'black' | 'tan' | 'dark_brown';

export type ContextPreset = 'Office' | 'Casual' | 'House' | 'Event' | 'Trip';
export type EventSubContext = 'Sangeet' | 'Eid' | 'Gala' | 'Wedding' | 'Other';
export interface ActiveMode {
  type: 'solo' | 'couple' | 'custom';
  memberIds: string[];
}
export type HouseholdType = 'couple' | 'family';

export type FamilyHierarchyRole =
  | 'head_of_household'
  | 'spouse'
  | 'elder_child'
  | 'younger_child'
  | 'parent_in_law'
  | 'relative';

export type HouseholdRole = 'husband' | 'wife' | 'partner' | 'family_member' | FamilyHierarchyRole;
export type TwinningTier = 'subtle' | 'balanced' | 'direct';

export interface CategoryLabel {
  id: ItemCategory;
  label: string;
  icon: string;
}

export const CATEGORIES: CategoryLabel[] = [
  { id: 'shirt', label: 'Shirts', icon: 'apparel' },
  { id: 'tshirt', label: 'T-Shirts', icon: 'checkroom' },
  { id: 'pants', label: 'Pants', icon: 'strikethrough_s' },
  { id: 'jeans', label: 'Jeans', icon: 'density_medium' },
  { id: 'nightwear', label: 'Nightwear', icon: 'bedtime' },
  { id: 'suit', label: 'Suits & Combos', icon: 'dry_cleaning' },
  { id: 'traditional_combo', label: 'Traditional Combos', icon: 'celebration' },
  { id: 'footwear', label: 'Shoes', icon: 'steps' },
  { id: 'belt', label: 'Belts', icon: 'line_weight' },
  { id: 'watch', label: 'Watches', icon: 'watch' },
  { id: 'accessory', label: 'Accessories', icon: 'diamond' },
];

export interface CulturalStyleLabel {
  id: CulturalStyle;
  label: string;
}

export const CULTURAL_STYLES: CulturalStyleLabel[] = [
  { id: 'western', label: 'Western' },
  { id: 'indian_traditional', label: 'Indian Traditional' },
  { id: 'islamic_modest', label: 'Islamic-Modest' },
];
