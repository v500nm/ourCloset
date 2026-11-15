/**
 * No-Repeat Guard & Recency Scoring
 * Per Claude Phase Plan §3 Phase 4:
 * - Dynamic recency penalty tapering off across a 14-day lookback window.
 * - Strongest penalty (0.45 - 0.50) for garments worn within 3 days (72 hours).
 * - Hard block on repeating an identical full outfit for the same event category within 30 days.
 */

import { OutfitHistory, WardrobeItem } from '@/types';

export interface RecencyEvaluationResult {
  penalty: number; // [0.0, 0.50]
  daysAgo?: number;
  explanation: string;
  isHardBlocked?: boolean;
}

/**
 * Calculates dynamic recency penalty for an individual garment.
 */
export function evaluateItemRecency(
  item: WardrobeItem,
  now: Date,
  recentLogs?: OutfitHistory[]
): RecencyEvaluationResult {
  let mostRecentDate: Date | null = item.last_worn_at ? new Date(item.last_worn_at) : null;

  // Cross-reference recent logs if provided
  if (recentLogs && recentLogs.length > 0) {
    for (const log of recentLogs) {
      if (log.item_ids && log.item_ids.includes(item.id)) {
        const logDate = new Date(log.worn_at);
        if (!mostRecentDate || logDate.getTime() > mostRecentDate.getTime()) {
          mostRecentDate = logDate;
        }
      }
    }
  }

  if (!mostRecentDate) {
    return {
      penalty: 0,
      explanation: 'No recent wear recorded (fresh rotation)',
    };
  }

  const diffMs = now.getTime() - mostRecentDate.getTime();
  const diffDays = Math.max(0, diffMs / (1000 * 60 * 60 * 24));
  const roundedDays = Math.round(diffDays);

  if (diffDays >= 14) {
    return {
      penalty: 0,
      daysAgo: roundedDays,
      explanation: `Worn ${roundedDays} days ago (clear of 14-day lookback guard)`,
    };
  }

  // Strongest penalty for items worn within 3 days (72 hours)
  if (diffDays <= 3) {
    // 0.45 to 0.50 penalty
    const penalty = Number((0.50 - diffDays * 0.02).toFixed(2));
    return {
      penalty,
      daysAgo: roundedDays,
      explanation: `Worn recently (${roundedDays === 0 ? 'today' : `${roundedDays} days ago`}; -${Math.round(penalty * 100)}% high recency penalty)`,
    };
  }

  // Tapering penalty between 4 and 14 days
  const decayFactor = (14 - diffDays) / 11; // 1.0 at day 3 to 0.0 at day 14
  const penalty = Number((decayFactor * 0.35).toFixed(2));

  return {
    penalty,
    daysAgo: roundedDays,
    explanation: `Worn ${roundedDays} days ago (-${Math.round(penalty * 100)}% rotation penalty)`,
  };
}

/**
 * Checks if an identical outfit combination was worn for the same recurring event category within 30 days.
 * Returns true if hard blocked.
 */
export function isIdenticalOutfitRepeated(
  candidateItemIds: string[],
  recentLogs: OutfitHistory[],
  eventContext?: string,
  now: Date = new Date(),
  daysLimit = 30
): { isRepeated: boolean; reason?: string } {
  if (!candidateItemIds || candidateItemIds.length === 0 || !recentLogs || recentLogs.length === 0) {
    return { isRepeated: false };
  }

  const sortedCandidates = [...candidateItemIds].sort();
  const cutoffMs = now.getTime() - daysLimit * 24 * 60 * 60 * 1000;

  for (const log of recentLogs) {
    const logTime = new Date(log.worn_at).getTime();
    if (logTime < cutoffMs) continue;

    // Check same event context (e.g. 'Wedding', 'Office', 'Sangeet')
    const contextMatches =
      !eventContext || !log.event_context || log.event_context.toLowerCase() === eventContext.toLowerCase();

    if (contextMatches) {
      const sortedLogItems = [...(log.item_ids || [])].sort();

      // Check identical item set
      const isIdentical =
        sortedCandidates.length === sortedLogItems.length &&
        sortedCandidates.every((id, idx) => id === sortedLogItems[idx]);

      if (isIdentical) {
        const daysAgo = Math.round((now.getTime() - logTime) / (1000 * 60 * 60 * 24));
        return {
          isRepeated: true,
          reason: `Identical outfit was already worn ${daysAgo} days ago for "${log.event_context || 'Event'}" (30-day no-repeat guard active)`,
        };
      }
    }
  }

  return { isRepeated: false };
}

