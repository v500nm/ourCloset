import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OurClosetDB } from '@/data/db';
import { OutfitRepository } from '@/data/repositories/outfitRepository';
import { OutfitHistory } from '@/types';

const sampleOutfit1: OutfitHistory = {
  id: 'outfit-01',
  household_id: 'household-01',
  worn_by: 'member-01',
  event_context: 'Office Review',
  item_ids: ['item-01', 'item-02'],
  worn_at: '2026-02-01T09:00:00Z',
  rating: 5,
  created_at: '2026-02-01T18:00:00Z',
};

const sampleOutfit2: OutfitHistory = {
  id: 'outfit-02',
  household_id: 'household-01',
  worn_by: 'member-01',
  event_context: 'Casual Dinner',
  item_ids: ['item-01'],
  worn_at: '2026-02-05T19:00:00Z',
  rating: 4,
  created_at: '2026-02-05T22:00:00Z',
};

const sampleOutfit3: OutfitHistory = {
  id: 'outfit-03',
  household_id: 'household-01',
  worn_by: 'member-02',
  event_context: 'Wedding Gala',
  item_ids: ['item-03'],
  worn_at: '2026-02-10T17:00:00Z',
  rating: 5,
  created_at: '2026-02-10T23:00:00Z',
};

describe('OutfitRepository', () => {
  let testDb: OurClosetDB;
  let repo: OutfitRepository;

  beforeEach(() => {
    testDb = new OurClosetDB(`test-outfits-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`);
    repo = new OutfitRepository(testDb);
  });

  afterEach(async () => {
    await testDb.delete();
  });

  it('logs and retrieves outfits', async () => {
    const id = await repo.logOutfit(sampleOutfit1);
    expect(id).toBe('outfit-01');

    const fetched = await repo.getById('outfit-01');
    expect(fetched?.event_context).toBe('Office Review');
    expect(fetched?.rating).toBe(5);

    expect(await repo.count()).toBe(1);
  });

  it('queries recent outfits ordered by recency', async () => {
    await repo.logOutfit(sampleOutfit1);
    await repo.logOutfit(sampleOutfit2);
    await repo.logOutfit(sampleOutfit3);

    const recentsMember1 = await repo.getRecentOutfits('member-01', 5);
    expect(recentsMember1).toHaveLength(2);
    // Most recent worn_at first
    expect(recentsMember1[0].id).toBe('outfit-02');
    expect(recentsMember1[1].id).toBe('outfit-01');
  });

  it('filters outfits by date range', async () => {
    await repo.logOutfit(sampleOutfit1);
    await repo.logOutfit(sampleOutfit2);
    await repo.logOutfit(sampleOutfit3);

    const range = await repo.getOutfitsByDateRange('2026-02-02T00:00:00Z', '2026-02-08T00:00:00Z');
    expect(range).toHaveLength(1);
    expect(range[0].id).toBe('outfit-02');
  });
});

