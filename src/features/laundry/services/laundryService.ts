import { LaundryStatus, LaundrySummary, WardrobeItem } from '../types/laundry.types';

export function calculateLaundrySummary(items: WardrobeItem[]): LaundrySummary {
  let cleanCount = 0;
  let dirtyCount = 0;
  let washCount = 0;
  let dryCleaningCount = 0;

  for (const item of items) {
    if (item.laundry_status === 'CLEAN') cleanCount++;
    else if (item.laundry_status === 'DIRTY') dirtyCount++;
    else if (item.laundry_status === 'IN_WASH') washCount++;
    else if (item.laundry_status === 'DRY_CLEANING') dryCleaningCount++;
  }

  return {
    totalItems: items.length,
    cleanCount,
    dirtyCount,
    washCount,
    dryCleaningCount,
    attentionRequiredCount: dirtyCount + washCount + dryCleaningCount,
  };
}
