import { CulturalStyle, FormalityLevel, LaundryStatus } from '@/types';

export const CULTURAL_TAXONOMIES: CulturalStyle[] = [
  'western',
  'indian_traditional',
  'islamic_modest',
];
export const FORMALITY_LEVELS: FormalityLevel[] = [1, 2, 3, 4, 5];
export const LAUNDRY_STATES: LaundryStatus[] = ['CLEAN', 'DIRTY', 'IN_WASH', 'DRY_CLEANING'];
export const DEFAULT_MATCH_WEIGHTS = {
  color: 0.6,
  silhouette: 0.4,
};
