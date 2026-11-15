import { get, set, del } from 'idb-keyval';
import { FamilyHierarchyRole, ItemCategory } from '@/types';

export interface LearnedPromptRecord {
  id: string;
  timestamp: string; // ISO 8601 string
  promptText: string;
  moodKeywords: string[];
  eventContext: string;
  hierarchyRole?: FamilyHierarchyRole | string;
  lockedItemIds: string[];
  userRating?: number; // 1-5 rating (3 = neutral baseline)
  weightBoostCategory?: ItemCategory;
}

export interface LearnedStats {
  totalRecords: number;
  topBoostedCategories: { category: ItemCategory; score: number }[];
  oldestRecordDate?: string;
  newestRecordDate?: string;
  activeRoles: string[];
}

export interface LearningEngineOptions {
  now?: Date;
  decayHalfLifeDays?: number; // default: 45 days
  alpha?: number; // Bayesian saturation rate, default: 0.28
}

const STORAGE_KEY = 'ourcloset_learned_prompts_v1';

/**
 * Retrieves the persisted learning history from IndexedDB.
 */
export async function getLearnedPromptHistory(): Promise<LearnedPromptRecord[]> {
  try {
    const history = await get<LearnedPromptRecord[]>(STORAGE_KEY);
    return history || [];
  } catch (err) {
    console.warn('Local learning storage fetch error:', err);
    return [];
  }
}

/**
 * Logs a new user prompt selection with locked garment choices.
 */
export async function logPromptSelection(
  record: Omit<LearnedPromptRecord, 'id' | 'timestamp'> & { timestamp?: string }
): Promise<LearnedPromptRecord> {
  const newRecord: LearnedPromptRecord = {
    ...record,
    id: `learned-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: record.timestamp || new Date().toISOString(),
  };

  try {
    const history = await getLearnedPromptHistory();
    const updated = [newRecord, ...history];
    await set(STORAGE_KEY, updated);
  } catch (err) {
    console.warn('Local learning storage save error:', err);
  }

  return newRecord;
}

/**
 * Resets all learned preferences and deletes historical prompt interactions.
 */
export async function resetLearnedPreferences(): Promise<void> {
  try {
    await del(STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to reset learned preferences:', err);
  }
}

/**
 * Analyzes past matching patterns to dynamically boost preferred clothing categories
 * and compute an evidence-based Bayesian confidence score.
 *
 * Audit Fix (November 2026):
 * - Fixed the bug where omitting hierarchyRole made `roleMatches = true` for every record,
 *   causing every past prompt to match and inflating confidence to 100% indiscriminately.
 * - Records MUST match the query text tokens or mood keywords.
 * - Evidence scales with Bayesian saturation: C = 1 - exp(-alpha * N_eff).
 * - Applies exponential temporal decay with 45-day half-life: w = exp(-lambda * deltaT).
 */
export async function getLearnedSuggestions(
  currentPrompt: string,
  hierarchyRole?: string,
  options: LearningEngineOptions = {}
): Promise<{
  boostedCategories: ItemCategory[];
  pastMatchingPrompts: LearnedPromptRecord[];
  confidenceScore: number;
  totalEvidenceWeight: number;
}> {
  const history = await getLearnedPromptHistory();
  if (history.length === 0 || !currentPrompt.trim()) {
    return {
      boostedCategories: [],
      pastMatchingPrompts: [],
      confidenceScore: 0,
      totalEvidenceWeight: 0,
    };
  }

  const nowTime = (options.now || new Date()).getTime();
  const halfLifeDays = options.decayHalfLifeDays || 45;
  const lambda = Math.LN2 / halfLifeDays; // decay parameter per day
  const alpha = options.alpha || 0.28;

  // Extract meaningful query tokens (length >= 3)
  const queryWords = currentPrompt
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  if (queryWords.length === 0) {
    return {
      boostedCategories: [],
      pastMatchingPrompts: [],
      confidenceScore: 0,
      totalEvidenceWeight: 0,
    };
  }

  interface ScoredRecord {
    record: LearnedPromptRecord;
    evidenceScore: number;
  }

  const scoredRecords: ScoredRecord[] = [];
  const categoryScores: Record<string, number> = {};

  for (const rec of history) {
    const promptLower = rec.promptText.toLowerCase();
    const moodWords = (rec.moodKeywords || []).map((k) => k.toLowerCase());
    const eventContextLower = (rec.eventContext || '').toLowerCase();

    // 1. Calculate token relevance
    let matchedTokenCount = 0;
    for (const word of queryWords) {
      if (
        promptLower.includes(word) ||
        moodWords.some((m) => m.includes(word) || word.includes(m)) ||
        eventContextLower.includes(word)
      ) {
        matchedTokenCount++;
      }
    }

    // STRICT REQUIREMENT: If zero tokens match, the prompt does NOT match!
    if (matchedTokenCount === 0) {
      continue;
    }

    const tokenRelevance = matchedTokenCount / Math.max(1, queryWords.length);

    // 2. Role matching factor
    let roleFactor = 1.0;
    if (hierarchyRole && rec.hierarchyRole) {
      roleFactor = rec.hierarchyRole === hierarchyRole ? 1.25 : 0.6;
    }

    // 3. User rating multiplier (1 to 5 stars, default 3)
    const rating = rec.userRating ?? 3;
    const ratingMultiplier = Math.max(0.3, Math.min(1.8, rating / 3.0));

    // 4. Exponential Time Decay: w = exp(-lambda * deltaT)
    const recordTime = new Date(rec.timestamp).getTime();
    const deltaDays = Math.max(0, (nowTime - recordTime) / (1000 * 60 * 60 * 24));
    const timeDecayWeight = Math.exp(-lambda * deltaDays);

    // 5. Total evidence contribution
    const evidence = timeDecayWeight * tokenRelevance * roleFactor * ratingMultiplier;

    if (evidence > 0.05) {
      scoredRecords.push({ record: rec, evidenceScore: evidence });

      if (rec.weightBoostCategory) {
        categoryScores[rec.weightBoostCategory] =
          (categoryScores[rec.weightBoostCategory] || 0) + evidence;
      }
    }
  }

  // Sort matched records by evidence score descending
  scoredRecords.sort((a, b) => b.evidenceScore - a.evidenceScore);

  // Total accumulated effective evidence
  const totalEvidenceWeight = scoredRecords.reduce((sum, item) => sum + item.evidenceScore, 0);

  // Bayesian confidence saturation formula: C = 1 - exp(-alpha * N_eff)
  // When totalEvidenceWeight = 0 -> 0%
  // When totalEvidenceWeight = 1 -> ~24%
  // When totalEvidenceWeight = 3 -> ~57%
  // When totalEvidenceWeight = 6 -> ~81%
  // When totalEvidenceWeight = 10 -> ~94%
  const confidenceScore = Math.min(
    100,
    Math.round((1 - Math.exp(-alpha * totalEvidenceWeight)) * 100)
  );

  // Sort boosted categories by accumulated evidence
  const boostedCategories = Object.entries(categoryScores)
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat as ItemCategory);

  return {
    boostedCategories,
    pastMatchingPrompts: scoredRecords.slice(0, 3).map((s) => s.record),
    confidenceScore,
    totalEvidenceWeight: Math.round(totalEvidenceWeight * 100) / 100,
  };
}

/**
 * Returns summary telemetry and statistics on the current local learning database.
 */
export async function getLearnedStats(): Promise<LearnedStats> {
  const history = await getLearnedPromptHistory();
  if (history.length === 0) {
    return {
      totalRecords: 0,
      topBoostedCategories: [],
      activeRoles: [],
    };
  }

  const categoryTotals: Record<string, number> = {};
  const rolesSet = new Set<string>();

  let oldest = history[0].timestamp;
  let newest = history[0].timestamp;

  for (const rec of history) {
    if (rec.weightBoostCategory) {
      categoryTotals[rec.weightBoostCategory] = (categoryTotals[rec.weightBoostCategory] || 0) + 1;
    }
    if (rec.hierarchyRole) {
      rolesSet.add(rec.hierarchyRole);
    }
    if (new Date(rec.timestamp) < new Date(oldest)) oldest = rec.timestamp;
    if (new Date(rec.timestamp) > new Date(newest)) newest = rec.timestamp;
  }

  const topBoostedCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([category, score]) => ({ category: category as ItemCategory, score }));

  return {
    totalRecords: history.length,
    topBoostedCategories,
    oldestRecordDate: oldest,
    newestRecordDate: newest,
    activeRoles: Array.from(rolesSet),
  };
}
