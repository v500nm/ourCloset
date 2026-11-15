import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/data/db';
import { exportWholeStore, importWholeStore } from '@/data/backup/exportImport';
import { WardrobeItem, OutfitHistory } from '@/types';
import { FamilyMember } from '@/providers/HouseholdProvider';

const testItem: WardrobeItem = {
  id: 'backup-item-01',
  user_id: 'user-01',
  title: 'Backup Test Shirt',
  category: 'shirt',
  cultural_style: 'western',
  formality_level: 3,
  image_url: 'https://example.com/backup.jpg',
  laundry_status: 'CLEAN',
  privacy_tier: 'PUBLIC',
  season_tags: ['all-season'],
  wear_count: 4,
  created_at: '2026-01-01T00:00:00Z',
};

const testOutfit: OutfitHistory = {
  id: 'backup-outfit-01',
  household_id: 'household-01',
  worn_by: 'user-01',
  event_context: 'Backup Test Event',
  item_ids: ['backup-item-01'],
  worn_at: '2026-01-05T12:00:00Z',
  created_at: '2026-01-05T12:00:00Z',
};

const testMember: FamilyMember = {
  id: 'user-01',
  name: 'Backup User',
  role: 'husband',
  hierarchyRole: 'head_of_household',
  closetCount: 1,
  privacyTier: 'PUBLIC',
  joinedAt: '2026-01-01',
};

describe('Export and Import Backup Pipeline', () => {
  beforeEach(async () => {
    await db.wardrobeItems.clear();
    await db.outfitLogs.clear();
    await db.members.clear();
    await db.blobs.clear();
  });

  afterEach(async () => {
    await db.wardrobeItems.clear();
    await db.outfitLogs.clear();
    await db.members.clear();
    await db.blobs.clear();
  });

  it('performs full roundtrip export and import with zero data loss', async () => {
    // Populate data
    await db.wardrobeItems.put(testItem);
    await db.outfitLogs.put(testOutfit);
    await db.members.put(testMember);
    await db.blobs.put({
      id: 'blob-01',
      dataUrl: 'data:image/jpeg;base64,sample',
      mimeType: 'image/jpeg',
      size: 100,
      createdAt: '2026-01-01T00:00:00Z',
    });

    // 1. Export
    const exportedJson = await exportWholeStore();
    expect(exportedJson).toContain('"app": "ourCloset"');
    expect(exportedJson).toContain('"backup-item-01"');

    // 2. Clear all tables
    await db.wardrobeItems.clear();
    await db.outfitLogs.clear();
    await db.members.clear();
    await db.blobs.clear();

    expect(await db.wardrobeItems.count()).toBe(0);
    expect(await db.outfitLogs.count()).toBe(0);

    // 3. Import
    const result = await importWholeStore(exportedJson);
    expect(result.success).toBe(true);
    expect(result.counts.items).toBe(1);
    expect(result.counts.outfits).toBe(1);
    expect(result.counts.members).toBe(1);
    expect(result.counts.blobs).toBe(1);

    // 4. Verify restored items
    const restoredItem = await db.wardrobeItems.get('backup-item-01');
    expect(restoredItem?.title).toBe('Backup Test Shirt');

    const restoredOutfit = await db.outfitLogs.get('backup-outfit-01');
    expect(restoredOutfit?.event_context).toBe('Backup Test Event');
  });

  it('throws an error on corrupt or malformed backup JSON', async () => {
    await expect(importWholeStore('not-valid-json')).rejects.toThrow('Invalid JSON');
    await expect(importWholeStore(JSON.stringify({ app: 'wrongApp' }))).rejects.toThrow('Invalid backup schema');
  });
});

