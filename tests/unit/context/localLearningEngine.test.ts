import { describe, it, expect, beforeEach } from 'vitest';
import {
  logPromptSelection,
  getLearnedSuggestions,
  resetLearnedPreferences,
  getLearnedPromptHistory,
  getLearnedStats,
} from '@/services/localLearningEngine';

describe('Local Learning Engine (Bayesian & Time-Decay Overhaul)', () => {
  beforeEach(async () => {
    await resetLearnedPreferences();
  });

  it('returns 0 confidence and empty boosts when history is empty', async () => {
    const res = await getLearnedSuggestions('executive corporate board meeting');
    expect(res.confidenceScore).toBe(0);
    expect(res.boostedCategories).toEqual([]);
    expect(res.pastMatchingPrompts).toEqual([]);
    expect(res.totalEvidenceWeight).toBe(0);
  });

  it('returns 0 confidence for blank or whitespace prompts', async () => {
    await logPromptSelection({
      promptText: 'Diwali pooja celebration',
      moodKeywords: ['diwali', 'pooja'],
      eventContext: 'Event',
      lockedItemIds: ['item-1'],
      weightBoostCategory: 'traditional_combo',
    });

    const res = await getLearnedSuggestions('   ');
    expect(res.confidenceScore).toBe(0);
    expect(res.boostedCategories).toEqual([]);
  });

  it('verifies the audit fix: omitting hierarchyRole does NOT match unrelated prompts', async () => {
    // Log a prompt about Indian Traditional Sangeet
    await logPromptSelection({
      promptText: 'Sarah and Tariq Sangeet Night with colorful dance vibes',
      moodKeywords: ['sangeet', 'dance', 'colorful', 'wedding'],
      eventContext: 'event_wedding_sangeet',
      lockedItemIds: ['SU-NVY-01', 'TC-GLD-01'],
      weightBoostCategory: 'traditional_combo',
    });

    // Query for a completely unrelated Western corporate meeting without passing hierarchyRole
    const res = await getLearnedSuggestions('executive board meeting in london');

    // In the old broken code, roleMatches was true, so confidence was 60% and sangeet matched!
    // With the fix: zero token overlap means zero match!
    expect(res.pastMatchingPrompts).toHaveLength(0);
    expect(res.boostedCategories).toHaveLength(0);
    expect(res.confidenceScore).toBe(0);
    expect(res.totalEvidenceWeight).toBe(0);
  });

  it('matches relevant prompts and scales confidence via Bayesian saturation C = 1 - exp(-alpha * N)', async () => {
    const now = new Date('2026-11-15T12:00:00Z');

    // 1 match
    await logPromptSelection({
      promptText: 'Friday Jummah congregation prayer at central mosque',
      moodKeywords: ['jummah', 'prayer', 'mosque'],
      eventContext: 'event_islamic_jummah_prayer',
      lockedItemIds: ['item-thobe-1'],
      weightBoostCategory: 'traditional_combo',
      timestamp: now.toISOString(),
    });

    const res1 = await getLearnedSuggestions('friday jummah prayer', undefined, { now });
    expect(res1.pastMatchingPrompts).toHaveLength(1);
    expect(res1.confidenceScore).toBeGreaterThanOrEqual(18);
    expect(res1.confidenceScore).toBeLessThanOrEqual(35);

    // Add 2 more matching records
    await logPromptSelection({
      promptText: 'Jummah sermon prayer with family',
      moodKeywords: ['jummah', 'prayer'],
      eventContext: 'event_islamic_jummah_prayer',
      lockedItemIds: ['item-thobe-2'],
      weightBoostCategory: 'traditional_combo',
      timestamp: now.toISOString(),
    });
    await logPromptSelection({
      promptText: 'Friday mosque prayer in linen thobe',
      moodKeywords: ['friday', 'prayer', 'mosque'],
      eventContext: 'event_islamic_jummah_prayer',
      lockedItemIds: ['item-thobe-3'],
      weightBoostCategory: 'traditional_combo',
      timestamp: now.toISOString(),
    });

    const res3 = await getLearnedSuggestions('friday jummah prayer', undefined, { now });
    expect(res3.confidenceScore).toBeGreaterThanOrEqual(50);
    expect(res3.confidenceScore).toBeLessThan(75);

    // Add 5 more records (total 8) to reach high saturation
    for (let i = 4; i <= 8; i++) {
      await logPromptSelection({
        promptText: `Jummah prayer round ${i} at mosque`,
        moodKeywords: ['jummah', 'prayer'],
        eventContext: 'event_islamic_jummah_prayer',
        lockedItemIds: [`item-thobe-${i}`],
        weightBoostCategory: 'traditional_combo',
        timestamp: now.toISOString(),
      });
    }

    const res8 = await getLearnedSuggestions('friday jummah prayer', undefined, { now });
    expect(res8.confidenceScore).toBeGreaterThanOrEqual(80);
    expect(res8.confidenceScore).toBeLessThanOrEqual(100);
  });

  it('discounts ancient records using exponential time decay (w = exp(-lambda * deltaT))', async () => {
    const today = new Date('2026-11-15T12:00:00Z');
    const ninetyDaysAgo = new Date('2026-08-17T12:00:00Z'); // 2 half-lives (45 days * 2)

    // Record from 90 days ago
    await logPromptSelection({
      promptText: 'Weekend brunch coffee walk with friends',
      moodKeywords: ['brunch', 'coffee', 'weekend'],
      eventContext: 'casual_weekend_brunch',
      lockedItemIds: ['item-brunch-old'],
      weightBoostCategory: 'shirt',
      timestamp: ninetyDaysAgo.toISOString(),
    });

    const oldRes = await getLearnedSuggestions('weekend brunch with friends', undefined, { now: today });
    // After 2 half-lives, weight is approx exp(-2 * ln2) = 0.25
    expect(oldRes.totalEvidenceWeight).toBeLessThan(0.4);
    expect(oldRes.confidenceScore).toBeLessThan(15);

    // Reset and log a brand new record today
    await resetLearnedPreferences();
    await logPromptSelection({
      promptText: 'Weekend brunch coffee walk with friends',
      moodKeywords: ['brunch', 'coffee', 'weekend'],
      eventContext: 'casual_weekend_brunch',
      lockedItemIds: ['item-brunch-new'],
      weightBoostCategory: 'shirt',
      timestamp: today.toISOString(),
    });

    const newRes = await getLearnedSuggestions('weekend brunch with friends', undefined, { now: today });
    expect(newRes.totalEvidenceWeight).toBeGreaterThan(0.7);
    expect(newRes.confidenceScore).toBeGreaterThan(oldRes.confidenceScore);
  });

  it('ranks boosted categories by accumulated decayed evidence', async () => {
    const now = new Date('2026-11-15T12:00:00Z');

    // 3 selections for jeans
    for (let i = 0; i < 3; i++) {
      await logPromptSelection({
        promptText: 'Casual coffee run and park walk',
        moodKeywords: ['casual', 'coffee', 'park'],
        eventContext: 'casual_weekend',
        lockedItemIds: [`j-${i}`],
        weightBoostCategory: 'jeans',
        timestamp: now.toISOString(),
      });
    }

    // 1 selection for tshirt
    await logPromptSelection({
      promptText: 'Casual coffee walk in morning',
      moodKeywords: ['casual', 'coffee'],
      eventContext: 'casual_weekend',
      lockedItemIds: ['t-1'],
      weightBoostCategory: 'tshirt',
      timestamp: now.toISOString(),
    });

    const res = await getLearnedSuggestions('casual coffee walk', undefined, { now });
    expect(res.boostedCategories[0]).toBe('jeans');
    expect(res.boostedCategories).toContain('tshirt');
  });

  it('resets all learned preferences cleanly', async () => {
    await logPromptSelection({
      promptText: 'Black tie opera gala',
      moodKeywords: ['gala', 'opera', 'tuxedo'],
      eventContext: 'event_gala',
      lockedItemIds: ['tux-1'],
      weightBoostCategory: 'suit',
    });

    let history = await getLearnedPromptHistory();
    expect(history).toHaveLength(1);

    await resetLearnedPreferences();

    history = await getLearnedPromptHistory();
    expect(history).toHaveLength(0);

    const stats = await getLearnedStats();
    expect(stats.totalRecords).toBe(0);
    expect(stats.topBoostedCategories).toEqual([]);
  });

  it('computes accurate telemetry statistics via getLearnedStats()', async () => {
    await logPromptSelection({
      promptText: 'Diwali pooja morning',
      moodKeywords: ['diwali', 'pooja'],
      eventContext: 'event_festive_diwali_pooja',
      lockedItemIds: ['tc-1'],
      weightBoostCategory: 'traditional_combo',
      hierarchyRole: 'husband',
      timestamp: '2026-11-01T10:00:00Z',
    });

    await logPromptSelection({
      promptText: 'Diwali family feast',
      moodKeywords: ['diwali', 'family'],
      eventContext: 'event_festive_diwali_pooja',
      lockedItemIds: ['tc-2'],
      weightBoostCategory: 'traditional_combo',
      hierarchyRole: 'wife',
      timestamp: '2026-11-02T10:00:00Z',
    });

    await logPromptSelection({
      promptText: 'Casual Sunday coffee',
      moodKeywords: ['coffee', 'sunday'],
      eventContext: 'casual_weekend_brunch',
      lockedItemIds: ['s-1'],
      weightBoostCategory: 'shirt',
      hierarchyRole: 'husband',
      timestamp: '2026-11-10T10:00:00Z',
    });

    const stats = await getLearnedStats();
    expect(stats.totalRecords).toBe(3);
    expect(stats.topBoostedCategories[0].category).toBe('traditional_combo');
    expect(stats.topBoostedCategories[0].score).toBe(2);
    expect(stats.activeRoles).toContain('husband');
    expect(stats.activeRoles).toContain('wife');
    expect(stats.oldestRecordDate).toBe('2026-11-01T10:00:00Z');
    expect(stats.newestRecordDate).toBe('2026-11-10T10:00:00Z');
  });
});
