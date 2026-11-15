import { WardrobeItem } from '@/types';

export interface LaundryResetResult {
  items: WardrobeItem[];
  resetApplied: boolean;
  newResetDate: Date;
}

/**
 * Computes the most recent Sunday 23:59:59.999 boundary that has already passed relative to `now`.
 * Pure helper without side effects.
 */
export function getMostRecentPassedSundayBoundary(now: Date): Date {
  const boundary = new Date(now.getTime());
  const dayOfWeek = boundary.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday

  if (dayOfWeek === 0) {
    // Today is Sunday. Check if 23:59:59.999 has already occurred.
    const todaySundayEOD = new Date(boundary.getFullYear(), boundary.getMonth(), boundary.getDate(), 23, 59, 59, 999);
    if (boundary.getTime() < todaySundayEOD.getTime()) {
      // EOD has not happened yet today, so the most recent passed boundary was last Sunday EOD.
      const lastSundayEOD = new Date(boundary.getFullYear(), boundary.getMonth(), boundary.getDate() - 7, 23, 59, 59, 999);
      return lastSundayEOD;
    }
    return todaySundayEOD;
  }

  // Days 1-6 (Monday through Saturday)
  const sundayEOD = new Date(boundary.getFullYear(), boundary.getMonth(), boundary.getDate() - dayOfWeek, 23, 59, 59, 999);
  return sundayEOD;
}

/**
 * Pure function: applies weekly laundry reset when the Sunday 11:59 PM boundary has passed.
 *
 * @param items - List of wardrobe items
 * @param now - Current reference timestamp
 * @param lastReset - Timestamp of previous reset, or null if first run
 * @returns Result with updated items (if reset was due), boolean flag, and new reset marker Date.
 */
export function applyWeeklyReset(
  items: WardrobeItem[],
  now: Date,
  lastReset: Date | null
): LaundryResetResult {
  const mostRecentBoundary = getMostRecentPassedSundayBoundary(now);

  const shouldReset = !lastReset || lastReset.getTime() < mostRecentBoundary.getTime();

  if (!shouldReset) {
    return {
      items,
      resetApplied: false,
      newResetDate: lastReset,
    };
  }

  let hasDirty = false;
  const updatedItems = items.map(item => {
    if (item.laundry_status === 'DIRTY') {
      hasDirty = true;
      return {
        ...item,
        laundry_status: 'CLEAN' as const,
      };
    }
    return item;
  });

  return {
    items: hasDirty ? updatedItems : items,
    resetApplied: true,
    newResetDate: mostRecentBoundary,
  };
}

