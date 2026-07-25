import { WardrobeItem } from '@/types';

export interface TwinningTierOption {
  tier: 'subtle' | 'balanced' | 'direct';
  label: string;
  description: string;
  colorWeight: number;
  silhouetteWeight: number;
  partnerOutfit: WardrobeItem[];
  matchReason: string;
}

export interface TwinningSessionState {
  initiatorOutfit: WardrobeItem[];
  tiers: TwinningTierOption[];
  selectedTier: 'subtle' | 'balanced' | 'direct';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  rerollsRemaining: number;
}
