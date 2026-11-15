import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OurClosetDB } from '@/data/db';
import { WardrobeRepository } from '@/data/repositories/wardrobeRepository';
import { WardrobeItem } from '@/types';

const sampleItem1: WardrobeItem = {
  id: 'item-01',
  user_id: 'user-01',
  title: 'Classic White Shirt',
  category: 'shirt',
  cultural_style: 'western',
  formality_level: 3,
  image_url: 'https://example.com/shirt.jpg',
  laundry_status: 'CLEAN',
  privacy_tier: 'PUBLIC',
  season_tags: ['all-season'],
  wear_count: 0,
  created_at: '2026-01-01T00:00:00Z',
};

const sampleItem2: WardrobeItem = {
  id: 'item-02',
  user_id: 'user-01',
  title: 'Charcoal Kurta',
  category: 'traditional_combo',
  cultural_style: 'indian_traditional',
  formality_level: 4,
  image_url: 'https://example.com/kurta.jpg',
  laundry_status: 'DIRTY',
  privacy_tier: 'PUBLIC',
  season_tags: ['summer'],
  wear_count: 2,
  created_at: '2026-01-02T00:00:00Z',
};

const sampleItem3: WardrobeItem = {
  id: 'item-03',
  user_id: 'user-02',
  title: 'Black Linen Abaya',
  category: 'traditional_combo',
  cultural_style: 'islamic_modest',
  formality_level: 4,
  image_url: 'https://example.com/abaya.jpg',
  laundry_status: 'CLEAN',
  privacy_tier: 'PRIVATE',
  season_tags: ['all-season'],
  wear_count: 1,
  created_at: '2026-01-03T00:00:00Z',
};

describe('WardrobeRepository', () => {
  let testDb: OurClosetDB;
  let repo: WardrobeRepository;

  beforeEach(() => {
    testDb = new OurClosetDB(`test-wardrobe-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`);
    repo = new WardrobeRepository(testDb);
  });

  afterEach(async () => {
    await testDb.delete();
  });

  it('performs basic CRUD operations', async () => {
    await repo.create(sampleItem1);

    const fetched = await repo.getById('item-01');
    expect(fetched).toBeDefined();
    expect(fetched?.title).toBe('Classic White Shirt');

    await repo.update('item-01', { wear_count: 3 });
    const updated = await repo.getById('item-01');
    expect(updated?.wear_count).toBe(3);

    // Soft delete
    await repo.delete('item-01', true);
    const softDeleted = await repo.getById('item-01');
    expect(softDeleted).toBeUndefined();

    // Verify it still exists in raw table with deleted_at tombstone
    const rawRecord = await testDb.wardrobeItems.get('item-01');
    expect(rawRecord?.deleted_at).toBeDefined();

    // Hard delete
    await repo.delete('item-01', false);
    const hardDeleted = await testDb.wardrobeItems.get('item-01');
    expect(hardDeleted).toBeUndefined();
  });

  it('handles bulk operations and counting', async () => {
    await repo.bulkCreate([sampleItem1, sampleItem2, sampleItem3]);

    expect(await repo.count()).toBe(3);
    expect(await repo.count('user-01')).toBe(2);
    expect(await repo.count('user-02')).toBe(1);

    const allUser1 = await repo.getAll('user-01');
    expect(allUser1).toHaveLength(2);

    await repo.clear();
    expect(await repo.count()).toBe(0);
  });

  it('filters by laundry status and compound user_id+laundry_status index', async () => {
    await repo.bulkCreate([sampleItem1, sampleItem2, sampleItem3]);

    const cleanAll = await repo.getByLaundryStatus('CLEAN');
    expect(cleanAll).toHaveLength(2);

    const dirtyUser1 = await repo.getByLaundryStatus('DIRTY', 'user-01');
    expect(dirtyUser1).toHaveLength(1);
    expect(dirtyUser1[0].id).toBe('item-02');

    const cleanUser1 = await repo.getByLaundryStatus('CLEAN', 'user-01');
    expect(cleanUser1).toHaveLength(1);
    expect(cleanUser1[0].id).toBe('item-01');
  });

  it('queries by compound cultural_style+category index', async () => {
    await repo.bulkCreate([sampleItem1, sampleItem2, sampleItem3]);

    const westernShirts = await repo.getByCategoryAndStyle('shirt', 'western');
    expect(westernShirts).toHaveLength(1);
    expect(westernShirts[0].id).toBe('item-01');

    const traditionalCombos = await repo.getByCategoryAndStyle('traditional_combo', 'indian_traditional');
    expect(traditionalCombos).toHaveLength(1);
    expect(traditionalCombos[0].id).toBe('item-02');
  });

  it('marks items dirty and updates laundry status atomically', async () => {
    await repo.bulkCreate([sampleItem1, sampleItem3]);

    await repo.markDirty(['item-01', 'item-03']);

    const item1 = await repo.getById('item-01');
    const item3 = await repo.getById('item-03');
    expect(item1?.laundry_status).toBe('DIRTY');
    expect(item3?.laundry_status).toBe('DIRTY');
    expect(item1?.last_worn_at).toBeDefined();

    await repo.updateLaundryStatus('item-01', 'IN_WASH');
    const washed = await repo.getById('item-01');
    expect(washed?.laundry_status).toBe('IN_WASH');
  });
});

