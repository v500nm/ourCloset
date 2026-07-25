import { get, set } from 'idb-keyval';
import { FamilyHierarchyRole, ItemCategory } from '@/types';

export interface LearnedPromptRecord {
  id: string;
  timestamp: string;
  promptText: string;
  moodKeywords: string[];
  eventContext: string;
  hierarchyRole?: FamilyHierarchyRole | string;
  lockedItemIds: string[];
  userRating?: number;
  weightBoostCategory?: ItemCategory;
}

const STORAGE_KEY = 'ourcloset_learned_prompts_v1';

export async function getLearnedPromptHistory(): Promise<LearnedPromptRecord[]> {
  try {
    const history = await get<LearnedPromptRecord[]>(STORAGE_KEY);
    return history || [];
  } catch (err) {
    console.warn('Local learning storage fetch error:', err);
    return [];
  }
}

export async function logPromptSelection(record: Omit<LearnedPromptRecord, 'id' | 'timestamp'>): Promise<LearnedPromptRecord> {
  const newRecord: LearnedPromptRecord = {
    ...record,
    id: `learned-${Date.now()}`,
    timestamp: new Date().toISOString(),
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

export async function getLearnedSuggestions(
  currentPrompt: string,
  hierarchyRole?: string
): Promise<{
  boostedCategories: ItemCategory[];
  pastMatchingPrompts: LearnedPromptRecord[];
  confidenceScore: number;
}> {
  const history = await getLearnedPromptHistory();
  const query = currentPrompt.toLowerCase();
  const queryWords = query.split(/\s+/);

  const matchedRecords = history.filter((rec) => {
    const promptLower = rec.promptText.toLowerCase();
    const wordMatches = queryWords.some((w) => w.length > 3 && promptLower.includes(w));
    const roleMatches = hierarchyRole ? rec.hierarchyRole === hierarchyRole : true;
    return wordMatches || roleMatches;
  });

  const categoryCounts: Record<string, number> = {};
  for (const rec of matchedRecords) {
    if (rec.weightBoostCategory) {
      categoryCounts[rec.weightBoostCategory] = (categoryCounts[rec.weightBoostCategory] || 0) + 1;
    }
  }

  const boostedCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat as ItemCategory);

  return {
    boostedCategories,
    pastMatchingPrompts: matchedRecords.slice(0, 3),
    confidenceScore: Math.min(100, 50 + matchedRecords.length * 10),
  };
}
