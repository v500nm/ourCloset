import { LaundryStatus, WardrobeItem } from '@/types';

export type LaundryFilterTab = 'ALL' | 'DIRTY_ONLY' | 'DRY_CLEANERS';

export interface LaundrySummary {
  totalItems: number;
  cleanCount: number;
  dirtyCount: number;
  washCount: number;
  dryCleaningCount: number;
  attentionRequiredCount: number;
}

export type { LaundryStatus, WardrobeItem };
