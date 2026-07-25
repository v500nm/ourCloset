import { OutfitHistory } from '@/types';

export interface LogOutfitParams {
  eventContext: string;
  itemIds: string[];
  wornAt?: string;
  rating?: number;
  photoUrl?: string;
}

export type { OutfitHistory };
